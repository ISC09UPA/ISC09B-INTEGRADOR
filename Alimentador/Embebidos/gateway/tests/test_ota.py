"""Flujo OTA completo con Blob Storage falso y el servidor LAN real (aiohttp)."""
import asyncio
import hashlib

import pytest
from aiohttp.test_utils import TestClient, TestServer

from alimentador_gateway.commands import GestorComandos
from alimentador_gateway.lan import crear_app
from alimentador_gateway.ota import GestorOta, nombre_blob

FIRMWARE = b"\xe9" + bytes(range(256)) * 400
SHA = hashlib.sha256(FIRMWARE).hexdigest()
URL_SAS = "https://blob.test/ota/firmware/1.3.0/feeder.bin?sv=2025&sig=abc"


def comando_ota(cid=16, sha=SHA, url=URL_SAS):
    return {"id": cid, "feederId": "f1", "type": "ota", "grams": None, "petId": None, "hopper": None,
            "url": url, "sha256": sha}


@pytest.fixture
def ota(tmp_path, backend):
    return GestorOta(tmp_path / "ota", backend, lambda: "192.168.1.50", 8080)


@pytest.fixture
def gestor(commands_cfg, store, broker, ota, reloj):
    g = GestorComandos(commands_cfg, store, broker.publicar, store.encolar, ota, reloj)
    g.espera_publicacion = 0.01
    return g


@pytest.fixture
async def cliente_lan(ota, store, tmp_path):
    app = crear_app(ota, tmp_path / "fotos", store.encolar, lambda: {"queue": store.tamano_cola()})
    async with TestClient(TestServer(app)) as cliente:
        yield cliente


def resultados(store):
    return [i.payload for i in store.primeros(100) if i.tipo == "result"]


async def esperar_cmd(broker):
    for _ in range(400):
        if broker.en("feeder/f1/cmd"):
            return broker.en("feeder/f1/cmd")[0]
        await asyncio.sleep(0.005)
    raise AssertionError("no se publicó el comando OTA")


def test_nombre_blob():
    assert nombre_blob(URL_SAS) == "firmware/1.3.0/feeder.bin"
    assert nombre_blob("http://127.0.0.1:10000/devstoreaccount1/ota/model/2026.11.1/m.tflite?sig=x") == \
        "model/2026.11.1/m.tflite"


async def test_ota_descarga_verifica_sirve_en_lan_y_reporta(gestor, falso, broker, store, ota, cliente_lan):
    falso.artefactos["/ota/firmware/1.3.0/feeder.bin"] = FIRMWARE
    gestor.recibir(comando_ota())
    cmd = await esperar_cmd(broker)

    archivo = f"{SHA[:12]}-feeder.bin"
    assert cmd == {"id": 16, "type": "ota", "target": "firmware",
                   "url": f"http://192.168.1.50:8080/ota/{archivo}", "sha256": SHA, "version": "1.3.0"}
    assert (ota.directorio / archivo).read_bytes() == FIRMWARE

    # El ESP32 descarga desde la Pi y vuelve a verificar
    resp = await cliente_lan.get(f"/ota/{archivo}")
    assert resp.status == 200
    cuerpo = await resp.read()
    assert hashlib.sha256(cuerpo).hexdigest() == SHA

    gestor.resultado_mqtt("f1", {"id": 16, "ok": True, "dispensedG": None, "error": None})
    await gestor.esperar_todos()
    assert resultados(store) == [{"commandId": 16, "result": {"ok": True, "dispensedG": None, "error": None}}]


async def test_ota_sha_incorrecto_no_se_publica(gestor, falso, broker, store, ota):
    falso.artefactos["/ota/firmware/1.3.0/feeder.bin"] = FIRMWARE + b"corrupto"
    gestor.recibir(comando_ota())
    await gestor.esperar_todos()
    assert broker.publicados == []
    assert resultados(store)[0]["result"] == {"ok": False, "dispensedG": None, "error": "sha256_mismatch"}
    assert list(ota.directorio.iterdir()) == []  # no quedan .part


async def test_ota_timeout_sin_resultado(gestor, falso, store, broker):
    falso.artefactos["/ota/firmware/1.3.0/feeder.bin"] = FIRMWARE
    gestor.recibir(comando_ota())
    await gestor.esperar_todos()
    assert broker.en("feeder/f1/cmd")
    assert resultados(store)[0]["result"]["error"] == "timeout"


async def test_ota_modelo_reutiliza_archivo_descargado(gestor, falso, broker, ota):
    url = "https://blob.test/ota/model/2026.11.2/model.tflite?sig=1"
    falso.artefactos["/ota/model/2026.11.2/model.tflite"] = FIRMWARE
    gestor.recibir(comando_ota(cid=20, url=url))
    cmd = await esperar_cmd(broker)
    assert (cmd["target"], cmd["version"]) == ("model", "2026.11.2")
    gestor.resultado_mqtt("f1", {"id": 20, "ok": True})
    await gestor.esperar_todos()

    del falso.artefactos["/ota/model/2026.11.2/model.tflite"]  # ya no haría falta descargar
    payload = await ota.preparar(comando_ota(cid=21, url=url))
    assert payload["url"].endswith("-model.tflite")


async def test_ota_url_invalida(gestor, store):
    gestor.recibir(comando_ota(sha="xyz"))
    await gestor.esperar_todos()
    assert resultados(store)[0]["result"]["error"].startswith("invalid_command")


async def test_lan_no_sirve_rutas_fuera_del_directorio(cliente_lan, ota):
    ota.directorio.mkdir(parents=True, exist_ok=True)
    (ota.directorio.parent / "secreto.txt").write_text("x")
    for ruta in ("/ota/..%2Fsecreto.txt", "/ota/.secreto", "/ota/no-existe.bin"):
        resp = await cliente_lan.get(ruta)
        assert resp.status == 404, ruta
