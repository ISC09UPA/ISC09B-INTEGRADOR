"""Dobles de prueba: backend falso (httpx.MockTransport), Blob Storage falso y broker falso."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alimentador_gateway.backend import BackendClient  # noqa: E402
from alimentador_gateway.config import BackendConfig, CommandsConfig  # noqa: E402
from alimentador_gateway.store import Store  # noqa: E402
from alimentador_gateway.util import Reloj  # noqa: E402

AHORA = 1_794_350_000
DEVICE_ID = "pi-prueba"
DEVICE_KEY = "clave-secreta"


class RelojFijo(Reloj):
    def __init__(self, t: int = AHORA):
        super().__init__(base=lambda: self.t)
        self.t = t

    def avanzar(self, segundos: int) -> None:
        self.t += segundos


class BackendFalso:
    """Imita /api/device del backend .NET con las respuestas de DeviceController."""

    def __init__(self):
        self.online = True
        self.peticiones: list[tuple[str, str, object]] = []
        self.fallas: dict[str, list[int]] = {}       # ruta -> códigos a devolver en orden
        self.config: dict | None = None             # ConfiguracionDispositivoDto
        self.comandos_pendientes: list[dict] = []
        self.visitas_vistas: set[str] = set()
        self.blobs: dict[str, bytes] = {}
        self.blob_headers: list[dict] = []
        self.artefactos: dict[str, bytes] = {}       # ruta en blob.test -> bytes
        self.rechazar_visita_con: str | None = None  # eventId que provoca 400 en el lote

    # --- utilidades ---
    def rutas(self) -> list[str]:
        return [f"{m} {p}" for m, p, _ in self.peticiones]

    def cuerpos(self, ruta: str) -> list:
        return [c for m, p, c in self.peticiones if p == ruta]

    # --- API ---
    def api(self, request: httpx.Request) -> httpx.Response:
        if not self.online:
            raise httpx.ConnectError("sin red", request=request)
        ruta = request.url.path
        cuerpo = json.loads(request.content) if request.content else None
        self.peticiones.append((request.method, ruta, cuerpo))

        if ruta == "/health":
            return httpx.Response(200, text="Healthy")
        if request.headers.get("X-Device-Id") != DEVICE_ID or request.headers.get("X-Device-Key") != DEVICE_KEY:
            return httpx.Response(401)
        if self.fallas.get(ruta):
            return httpx.Response(self.fallas[ruta].pop(0), json={"title": "falla simulada"})

        if ruta == "/api/device/config":
            version = int(request.url.params["version"])
            if self.config is None or all(f["version"] <= version for f in self.config["feeders"]):
                return httpx.Response(204)
            return httpx.Response(200, json=self.config)
        if ruta == "/api/device/heartbeat":
            return httpx.Response(200, json={"serverTime": AHORA})
        if ruta == "/api/device/sync-complete":
            return httpx.Response(204)
        if ruta in ("/api/device/visits", "/api/device/events"):
            if self.rechazar_visita_con and any(v.get("eventId") == self.rechazar_visita_con for v in cuerpo):
                return httpx.Response(400, json={"title": "Datos inválidos"})
            nuevos = [v for v in cuerpo if v["eventId"] not in self.visitas_vistas]
            self.visitas_vistas.update(v["eventId"] for v in cuerpo)
            return httpx.Response(200, json={"recibidos": len(nuevos), "duplicados": len(cuerpo) - len(nuevos),
                                             "rechazados": 0})
        if ruta == "/api/device/commands":
            entregar, self.comandos_pendientes = self.comandos_pendientes, []
            return httpx.Response(200, json=entregar)
        if ruta.startswith("/api/device/commands/") and ruta.endswith("/result"):
            return httpx.Response(204)
        if ruta == "/api/device/photos":
            nombre = f"{cuerpo['feederId']}/2026/11/10/{cuerpo['eventId']}.jpg"
            return httpx.Response(200, json={"uploadUrl": f"https://blob.test/fotos-dudosas/{nombre}?sig=abc",
                                             "blobName": nombre})
        if ruta == "/api/device/photos/confirm":
            return httpx.Response(204)
        return httpx.Response(404)

    # --- Blob Storage ---
    def blob(self, request: httpx.Request) -> httpx.Response:
        if not self.online:
            raise httpx.ConnectError("sin red", request=request)
        assert "X-Device-Key" not in request.headers, "la clave del dispositivo no debe ir a Blob Storage"
        ruta = request.url.path
        if request.method == "PUT":
            self.blob_headers.append(dict(request.headers))
            if request.headers.get("x-ms-blob-type") != "BlockBlob":
                return httpx.Response(400)
            self.blobs[ruta] = request.content
            return httpx.Response(201)
        if request.method == "GET" and ruta in self.artefactos:
            return httpx.Response(200, content=self.artefactos[ruta])
        return httpx.Response(404)


class BrokerFalso:
    def __init__(self):
        self.conectado = True
        self.publicados: list[tuple[str, dict | None, bool]] = []

    async def publicar(self, tema: str, payload: bytes, retain: bool = False, qos: int = 1) -> bool:
        if not self.conectado:
            return False
        self.publicados.append((tema, json.loads(payload) if payload else None, retain))
        return True

    def en(self, tema: str) -> list:
        return [p for t, p, _ in self.publicados if t == tema]


@pytest.fixture
def reloj():
    return RelojFijo()


@pytest.fixture
def falso():
    return BackendFalso()


@pytest.fixture
async def backend(falso):
    cliente = BackendClient("https://api.test", DEVICE_ID, DEVICE_KEY,
                            transport=httpx.MockTransport(falso.api),
                            blob_transport=httpx.MockTransport(falso.blob))
    yield cliente
    await cliente.aclose()


@pytest.fixture
def store(tmp_path):
    s = Store(tmp_path / "gateway.db")
    yield s
    s.close()


@pytest.fixture
def broker():
    return BrokerFalso()


@pytest.fixture
def backend_cfg():
    return BackendConfig(url="https://api.test", device_id=DEVICE_ID, device_key=DEVICE_KEY,
                         batch_size=50, backoff_base=0.01, backoff_max=0.05)


@pytest.fixture
def commands_cfg():
    return CommandsConfig(dispense_timeout=0.3, dispense_max_age=120, ota_timeout=0.5)
