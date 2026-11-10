"""Cliente HTTP del backend (/api/device/*, autenticado con X-Device-Id / X-Device-Key)."""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any

import httpx

log = logging.getLogger(__name__)


class BackendError(Exception):
    """Error de red o respuesta no exitosa.

    `status` es None cuando no hubo respuesta (sin internet, DNS, timeout).
    """

    def __init__(self, mensaje: str, status: int | None = None):
        super().__init__(mensaje)
        self.status = status

    @property
    def sin_red(self) -> bool:
        return self.status is None

    @property
    def definitivo(self) -> bool:
        """El backend rechazó la petición y reintentarla no cambiará nada (400, 404, 409, 413, 422)."""
        return self.status is not None and 400 <= self.status < 500 and self.status not in (401, 403, 408, 429)


class Sha256NoCoincide(Exception):
    pass


class BackendClient:
    def __init__(self, url: str, device_id: str, device_key: str, timeout: float = 15.0,
                 transport: httpx.AsyncBaseTransport | None = None,
                 blob_transport: httpx.AsyncBaseTransport | None = None):
        self._api = httpx.AsyncClient(
            base_url=url.rstrip("/"),
            headers={"X-Device-Id": device_id, "X-Device-Key": device_key, "Accept": "application/json"},
            timeout=timeout,
            transport=transport,
        )
        # Cliente aparte para Blob Storage: nunca debe llevar la clave del dispositivo
        self._blob = httpx.AsyncClient(timeout=httpx.Timeout(timeout, read=120.0), transport=blob_transport,
                                       follow_redirects=True)

    async def aclose(self) -> None:
        await self._api.aclose()
        await self._blob.aclose()

    async def _pedir(self, metodo: str, ruta: str, **kwargs: Any) -> httpx.Response:
        try:
            resp = await self._api.request(metodo, ruta, **kwargs)
        except httpx.HTTPError as e:
            raise BackendError(f"{metodo} {ruta}: {type(e).__name__}: {e}") from e
        if resp.status_code >= 400:
            cuerpo = resp.text[:300]
            raise BackendError(f"{metodo} {ruta}: HTTP {resp.status_code} {cuerpo}", resp.status_code)
        return resp

    # ---------------- conectividad ----------------

    async def health(self) -> bool:
        """GET /health (sin autenticación). True si el backend responde 200."""
        try:
            resp = await self._api.get("/health")
            return resp.status_code == 200
        except httpx.HTTPError:
            return False

    # ---------------- /api/device ----------------

    async def config(self, version: int) -> dict[str, Any] | None:
        """GET config?version=N. None si respondió 204 (nada cambió)."""
        resp = await self._pedir("GET", "/api/device/config", params={"version": version})
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    async def heartbeat(self, feeders: list[dict[str, Any]], offline_since: int | None) -> dict[str, Any]:
        resp = await self._pedir("POST", "/api/device/heartbeat",
                                 json={"offlineSince": offline_since, "feeders": feeders})
        return resp.json()

    async def sync_complete(self) -> None:
        await self._pedir("POST", "/api/device/sync-complete")

    async def visitas(self, lote: list[dict[str, Any]]) -> dict[str, Any]:
        return (await self._pedir("POST", "/api/device/visits", json=lote)).json()

    async def eventos(self, lote: list[dict[str, Any]]) -> dict[str, Any]:
        return (await self._pedir("POST", "/api/device/events", json=lote)).json()

    async def comandos(self) -> list[dict[str, Any]]:
        datos = (await self._pedir("GET", "/api/device/commands")).json()
        return datos if isinstance(datos, list) else []

    async def resultado_comando(self, comando_id: int, resultado: dict[str, Any]) -> None:
        await self._pedir("POST", f"/api/device/commands/{int(comando_id)}/result", json=resultado)

    async def solicitar_foto(self, solicitud: dict[str, Any]) -> dict[str, Any]:
        """POST photos -> {uploadUrl, blobName}."""
        return (await self._pedir("POST", "/api/device/photos", json=solicitud)).json()

    async def confirmar_foto(self, feeder_id: str, event_id: str) -> None:
        await self._pedir("POST", "/api/device/photos/confirm", json={"feederId": feeder_id, "eventId": event_id})

    # ---------------- Blob Storage (URL SAS) ----------------

    async def subir_blob(self, url_sas: str, contenido: bytes, content_type: str = "image/jpeg") -> None:
        try:
            resp = await self._blob.put(url_sas, content=contenido, headers={
                "x-ms-blob-type": "BlockBlob",
                "Content-Type": content_type,
            })
        except httpx.HTTPError as e:
            raise BackendError(f"PUT blob: {type(e).__name__}: {e}") from e
        if resp.status_code >= 400:
            # 403 suele ser SAS vencida: se reintenta pidiendo otra URL
            status = resp.status_code if resp.status_code != 403 else 503
            raise BackendError(f"PUT blob: HTTP {resp.status_code} {resp.text[:200]}", status)

    async def descargar(self, url_sas: str, destino: Path, sha256_esperado: str) -> int:
        """Descarga en streaming a destino verificando el SHA-256. Devuelve el tamaño."""
        temporal = destino.with_name(destino.name + ".part")
        h = hashlib.sha256()
        tamano = 0
        try:
            async with self._blob.stream("GET", url_sas) as resp:
                if resp.status_code >= 400:
                    raise BackendError(f"GET artefacto: HTTP {resp.status_code}", resp.status_code)
                with temporal.open("wb") as f:
                    async for bloque in resp.aiter_bytes(64 * 1024):
                        h.update(bloque)
                        f.write(bloque)
                        tamano += len(bloque)
        except httpx.HTTPError as e:
            temporal.unlink(missing_ok=True)
            raise BackendError(f"GET artefacto: {type(e).__name__}: {e}") from e
        except BaseException:
            temporal.unlink(missing_ok=True)
            raise
        if h.hexdigest() != sha256_esperado.lower():
            temporal.unlink(missing_ok=True)
            raise Sha256NoCoincide(f"SHA-256 {h.hexdigest()} != {sha256_esperado.lower()}")
        temporal.replace(destino)
        return tamano
