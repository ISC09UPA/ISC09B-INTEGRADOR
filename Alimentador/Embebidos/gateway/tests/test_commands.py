"""Comandos dispense: publicación al ESP32, espera de cmd/result, timeouts y reanudación."""
import asyncio

import pytest

from alimentador_gateway.commands import GestorComandos
from alimentador_gateway.ota import GestorOta

from conftest import AHORA


def dispensar(cid=15, feeder="f1"):
    return {"id": cid, "feederId": feeder, "type": "dispense", "grams": 30.0, "petId": 3, "hopper": 2,
            "url": None, "sha256": None}


@pytest.fixture
def cola(store):
    def encolar(tipo, payload):
        return store.encolar(tipo, payload)
    return encolar


@pytest.fixture
def gestor(commands_cfg, store, broker, cola, backend, reloj, tmp_path):
    ota = GestorOta(tmp_path / "ota", backend, lambda: "192.168.1.50", 8080)
    g = GestorComandos(commands_cfg, store, broker.publicar, cola, ota, reloj)
    g.espera_publicacion = 0.01
    return g


def resultados(store):
    return [i.payload for i in store.primeros(100) if i.tipo == "result"]


async def esperar_publicacion(broker, tema, n=1):
    for _ in range(200):
        if len(broker.en(tema)) >= n:
            return
        await asyncio.sleep(0.005)
    raise AssertionError(f"no se publicó {tema}")


async def test_dispense_publica_y_reenvia_resultado(gestor, broker, store):
    assert gestor.recibir(dispensar()) is True
    await esperar_publicacion(broker, "feeder/f1/cmd")
    assert broker.en("feeder/f1/cmd") == [{"id": 15, "type": "dispense", "grams": 30.0, "petId": 3, "hopper": 2}]
    assert store.comando(15).estado == "enviado"

    gestor.resultado_mqtt("f1", {"id": 15, "ok": True, "dispensedG": 29.8, "error": None})
    await gestor.esperar_todos()
    assert resultados(store) == [{"commandId": 15, "result": {"ok": True, "dispensedG": 29.8, "error": None}}]
    assert store.comando(15).estado == "terminado"

    # Repetido (el ESP32 lo reenvía desde LittleFS): se ignora
    gestor.resultado_mqtt("f1", {"id": 15, "ok": True, "dispensedG": 29.8})
    assert len(resultados(store)) == 1


async def test_comando_repetido_no_se_ejecuta_dos_veces(gestor, broker):
    assert gestor.recibir(dispensar()) is True
    assert gestor.recibir(dispensar()) is False
    await esperar_publicacion(broker, "feeder/f1/cmd")
    gestor.resultado_mqtt("f1", {"id": 15, "ok": True, "dispensedG": 30})
    await gestor.esperar_todos()
    assert len(broker.en("feeder/f1/cmd")) == 1


async def test_dispense_timeout(gestor, store):
    gestor.recibir(dispensar())
    await gestor.esperar_todos()
    assert resultados(store) == [{"commandId": 15, "result": {"ok": False, "dispensedG": None, "error": "timeout"}}]


async def test_dispense_vencido_no_se_publica(gestor, store, broker, reloj):
    store.agregar_comando(dispensar(), AHORA - 500)  # llegó antes de un reinicio largo
    gestor.reanudar()
    await gestor.esperar_todos()
    assert broker.publicados == []
    assert resultados(store)[0]["result"]["error"] == "expired"


async def test_dispense_esp32_desconectado(gestor, store, broker):
    store.guardar_status("f1", {"feederId": "f1", "online": False, "reportedAt": AHORA})
    gestor.recibir(dispensar())
    await gestor.esperar_todos()
    assert broker.publicados == []
    assert resultados(store)[0]["result"]["error"] == "feeder_offline"


async def test_dispense_sin_mqtt_hasta_vencer(gestor, store, broker, reloj, commands_cfg):
    commands_cfg.dispense_max_age = 0
    broker.conectado = False
    gestor.recibir(dispensar())
    await gestor.esperar_todos()
    assert resultados(store)[0]["result"]["error"] == "mqtt_unavailable"


async def test_reanuda_comando_enviado_y_acepta_resultado_tardio(gestor, store, broker):
    store.agregar_comando(dispensar(), AHORA)
    store.marcar_comando(15, "enviado", AHORA)
    gestor.reanudar()
    await asyncio.sleep(0.01)
    assert broker.publicados == [], "un comando ya enviado no se vuelve a publicar"
    gestor.resultado_mqtt("f1", {"id": 15, "ok": False, "dispensedG": 0.0, "error": "jam"})
    await gestor.esperar_todos()
    assert resultados(store)[0]["result"] == {"ok": False, "dispensedG": 0.0, "error": "jam"}


async def test_resultado_de_otro_alimentador_se_ignora(gestor, store, broker):
    gestor.recibir(dispensar(feeder="f1"))
    await esperar_publicacion(broker, "feeder/f1/cmd")
    gestor._esperas.pop(15)  # simula que ya no hay espera activa
    gestor.resultado_mqtt("f2", {"id": 15, "ok": True})
    assert resultados(store) == []
    await gestor.esperar_todos()


async def test_comando_invalido_se_reporta(gestor, store):
    assert gestor.recibir({"id": 9, "feederId": "f1", "type": "reboot"}) is False
    assert resultados(store)[0]["commandId"] == 9
    assert resultados(store)[0]["result"]["ok"] is False
