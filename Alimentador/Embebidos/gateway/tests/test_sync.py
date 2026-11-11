"""Flujo offline -> online contra el backend falso."""
import pytest

from alimentador_gateway.backend import BackendError
from alimentador_gateway.sync import Sincronizador

from conftest import AHORA


@pytest.fixture
def sync(backend_cfg, store, backend, broker, reloj):
    s = Sincronizador(backend_cfg, store, backend, broker.publicar, reloj)
    s.iniciar()
    return s


def visita(n: int) -> dict:
    return {"feederId": "f1", "eventId": f"v{n}", "petId": None, "class": "Gato", "confidence": 0.9,
            "startedAt": AHORA, "endedAt": AHORA + 1, "plateBeforeG": 0.0, "dispensedG": 0.0,
            "plateAfterG": 0.0}


def evento(n: int) -> dict:
    return {"feederId": "f1", "eventId": f"e{n}", "type": "JAM", "occurredAt": AHORA, "detail": None,
            "hopper": 1}


async def vaciar(sync, maximo=50):
    for _ in range(maximo):
        if not await sync.vaciar_una_vez():
            return


async def test_offline_luego_heartbeat_con_offline_since_cola_en_orden_y_sync_complete(sync, falso, store, reloj):
    falso.online = False
    assert await sync.comprobar_conexion() is False
    assert store.obtener("offline_since") == AHORA

    reloj.avanzar(600)
    sync.encolar("visit", visita(1))
    sync.encolar("visit", visita(2))
    sync.encolar("event", evento(1))
    sync.encolar("visit", visita(3))
    sync.encolar("result", {"commandId": 15, "result": {"ok": True, "dispensedG": 29.8, "error": None}})
    store.guardar_status("f1", {"feederId": "f1", "online": True, "hopperDogPct": 70.0, "hopperCatPct": 40.0,
                                "plateDogG": 1.0, "plateCatG": 0.0, "firmware": "1.2.0", "model": "1",
                                "reportedAt": AHORA + 590})

    falso.online = True
    assert await sync.comprobar_conexion() is True
    await vaciar(sync)

    assert falso.rutas() == [
        "GET /health",                      # el que falló no se registra; este es el que vuelve
        "POST /api/device/heartbeat",
        "POST /api/device/visits",
        "POST /api/device/events",
        "POST /api/device/visits",
        "POST /api/device/commands/15/result",
        "POST /api/device/sync-complete",
    ]
    hb = falso.cuerpos("/api/device/heartbeat")[0]
    assert hb["offlineSince"] == AHORA
    assert hb["feeders"][0]["feederId"] == "f1" and hb["feeders"][0]["reportedAt"] == AHORA + 590
    assert [v["eventId"] for v in falso.cuerpos("/api/device/visits")[0]] == ["v1", "v2"]
    assert falso.cuerpos("/api/device/commands/15/result")[0] == {"ok": True, "dispensedG": 29.8, "error": None}
    assert store.tamano_cola() == 0
    assert store.obtener("offline_since") is None

    # Los heartbeats siguientes ya no llevan offlineSince y no se repite sync-complete
    await sync.enviar_heartbeat()
    assert falso.cuerpos("/api/device/heartbeat")[1]["offlineSince"] is None
    assert await sync.vaciar_una_vez() is False
    assert falso.rutas().count("POST /api/device/sync-complete") == 1


async def test_error_5xx_conserva_el_lote_y_reintenta(sync, falso, store):
    await sync.comprobar_conexion()
    sync.encolar("visit", visita(1))
    falso.fallas["/api/device/visits"] = [503]
    with pytest.raises(BackendError):
        await sync.vaciar_una_vez()
    assert store.tamano_cola() == 1
    assert await sync.vaciar_una_vez() is True
    assert store.tamano_cola() == 0


async def test_sin_red_a_media_cola_marca_offline(sync, falso, store):
    await sync.comprobar_conexion()
    sync.encolar("visit", visita(1))
    falso.online = False
    with pytest.raises(BackendError) as e:
        await sync.vaciar_una_vez()
    assert e.value.sin_red
    sync.marcar_sin_red()
    assert sync.en_linea is False
    assert store.obtener("offline_since") == AHORA
    assert store.tamano_cola() == 1


async def test_lote_con_registro_invalido_se_parte_y_descarta_solo_el_malo(sync, falso, store):
    await sync.comprobar_conexion()
    for n in range(3):
        sync.encolar("visit", visita(n))
    falso.rechazar_visita_con = "v1"
    await vaciar(sync)
    assert store.tamano_cola() == 0
    assert store.total_descartados() == 1
    assert falso.visitas_vistas == {"v0", "v2"}


async def test_reenvio_es_idempotente(sync, falso, store):
    await sync.comprobar_conexion()
    sync.encolar("visit", visita(1))
    sync.encolar("visit", visita(1))  # el ESP32 lo reenvió desde LittleFS
    await vaciar(sync)
    assert falso.visitas_vistas == {"v1"}


async def test_credenciales_invalidas_no_pierden_datos(backend_cfg, store, falso, broker, reloj):
    import httpx

    from alimentador_gateway.backend import BackendClient
    malo = BackendClient("https://api.test", "pi-prueba", "otra", transport=httpx.MockTransport(falso.api))
    s = Sincronizador(backend_cfg, store, malo, broker.publicar, reloj)
    s.encolar("visit", visita(1))
    assert await s.comprobar_conexion() is False  # el heartbeat dio 401
    assert store.tamano_cola() == 1
    await malo.aclose()


async def test_config_respeta_204_publica_retained_y_borra_desligados(sync, falso, store, broker):
    await sync.comprobar_conexion()
    assert await sync.actualizar_config() is False  # 204
    assert falso.cuerpos("/api/device/config") == [None]

    f1 = {"feederId": "f1", "version": 3, "minIntervalHours": 4, "timeZone": "America/Mexico_City",
          "pets": [{"id": 3, "name": "Michi", "species": "gato", "hopper": 2, "rfid": None, "gramsPerMeal": 25.0}],
          "schedules": [{"petId": 3, "time": "08:00"}]}
    f2 = {**f1, "feederId": "f2", "version": 1, "pets": [], "schedules": []}
    falso.config = {"feeders": [f1, f2]}
    assert await sync.actualizar_config() is True
    assert ("feeder/f1/config", f1, True) in broker.publicados
    assert ("feeder/f2/config", f2, True) in broker.publicados
    assert store.obtener("config_version") == 3

    # Sin cambios: 204 con version=3
    assert await sync.actualizar_config() is False
    peticiones = [p for m, p, _ in falso.peticiones if p == "/api/device/config"]
    assert len(peticiones) == 3

    # f2 se desliga y f1 cambia
    f1b = {**f1, "version": 4, "minIntervalHours": 6}
    falso.config = {"feeders": [f1b]}
    broker.publicados.clear()
    assert await sync.actualizar_config() is True
    assert broker.publicados == [("feeder/f1/config", f1b, True), ("feeder/f2/config", None, True)]
    assert set(store.configs()) == {"f1"}


async def test_republicar_configs_al_reconectar_mqtt(sync, store, broker):
    store.guardar_config("f1", 2, {"feederId": "f1", "version": 2})
    await sync.republicar_configs()
    assert broker.publicados == [("feeder/f1/config", {"feederId": "f1", "version": 2}, True)]


async def test_foto_pide_sas_sube_blockblob_y_confirma(sync, falso, store, tmp_path):
    await sync.comprobar_conexion()
    foto = tmp_path / "f1_x.jpg"
    foto.write_bytes(b"\xff\xd8jpeg")
    sync.encolar("photo", {"feederId": "f1", "eventId": "v9", "class": "Gato", "confidence": 0.41,
                           "takenAt": AHORA, "archivo": str(foto)})
    await vaciar(sync)
    assert falso.cuerpos("/api/device/photos")[0] == {"feederId": "f1", "eventId": "v9", "class": "Gato",
                                                      "confidence": 0.41, "takenAt": AHORA}
    assert falso.blobs["/fotos-dudosas/f1/2026/11/10/v9.jpg"] == b"\xff\xd8jpeg"
    assert falso.blob_headers[0]["x-ms-blob-type"] == "BlockBlob"
    assert falso.blob_headers[0]["content-type"] == "image/jpeg"
    assert falso.cuerpos("/api/device/photos/confirm")[0] == {"feederId": "f1", "eventId": "v9"}
    assert not foto.exists()
    assert store.tamano_cola() == 0


async def test_heartbeat_corrige_reloj(sync, reloj):
    reloj.t = AHORA - 3600  # la Pi arrancó sin hora
    await sync.comprobar_conexion()
    assert reloj.ahora() == AHORA


async def test_comandos_se_entregan_al_gestor(sync, falso):
    recibidos = []
    sync.recibir_comando = recibidos.append
    falso.comandos_pendientes = [{"id": 1, "feederId": "f1", "type": "dispense", "grams": 10.0, "petId": None,
                                  "hopper": 1, "url": None, "sha256": None}]
    await sync.comprobar_conexion()
    assert await sync.obtener_comandos() == 1
    assert recibidos[0]["id"] == 1


async def test_respuesta_no_json_es_falla_temporal(backend_cfg, store, broker, reloj):
    import httpx

    from alimentador_gateway.backend import BackendClient

    def api(request):
        if request.url.path == "/health":
            return httpx.Response(200)
        if request.url.path.endswith("/heartbeat"):
            return httpx.Response(200, json={"serverTime": AHORA})
        return httpx.Response(200, text="<html>portal cautivo</html>")

    cliente = BackendClient("https://api.test", "pi", "k", transport=httpx.MockTransport(api))
    s = Sincronizador(backend_cfg, store, cliente, broker.publicar, reloj)
    s.encolar("visit", visita(1))
    assert await s.comprobar_conexion() is True
    with pytest.raises(BackendError) as e:
        await s.vaciar_una_vez()
    assert not e.value.definitivo
    assert store.tamano_cola() == 1
    await cliente.aclose()
