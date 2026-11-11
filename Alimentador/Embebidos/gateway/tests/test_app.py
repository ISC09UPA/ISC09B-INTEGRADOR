"""Despacho de mensajes MQTT en el gateway ensamblado."""
import json

import pytest

from alimentador_gateway.app import Gateway
from alimentador_gateway.config import from_dict

from conftest import AHORA, RelojFijo


@pytest.fixture
async def gateway(tmp_path):
    cfg = from_dict({
        "backend": {"url": "https://api.test/", "device_id": "pi", "device_key": "k"},
        "lan": {"public_host": "192.168.1.50"},
        "paths": {"data_dir": str(tmp_path), "ota_dir": str(tmp_path / "ota"),
                  "photos_dir": str(tmp_path / "fotos")},
    })
    g = Gateway(cfg)
    g.reloj = g.sync.reloj = RelojFijo()
    yield g
    await g.backend.aclose()
    g.store.close()


def enviar(g, tema, datos):
    g.manejar_mensaje(tema, json.dumps(datos).encode(), False)


async def test_status_visit_event_van_a_su_destino(gateway):
    enviar(gateway, "feeder/f1/status", {"online": True, "hopperDogPct": 72.0, "hopperCatPct": 40.5,
                                         "plateDogG": 3.1, "plateCatG": 0.0, "firmware": "1.2.0",
                                         "model": "2026.11.1", "reportedAt": AHORA})
    enviar(gateway, "feeder/f1/visit", {"eventId": "u1", "petId": 3, "class": "Gato", "confidence": 0.93,
                                        "startedAt": AHORA, "endedAt": AHORA + 30, "plateBeforeG": 3.1,
                                        "dispensedG": 31.2, "plateAfterG": 5.0})
    enviar(gateway, "feeder/f1/event", {"eventId": "u2", "type": "JAM", "occurredAt": AHORA, "detail": None,
                                        "hopper": 1})
    enviar(gateway, "feeder/f1/visit", {"eventId": "u3"})          # inválido: se ignora
    gateway.manejar_mensaje("feeder/f1/visit", b"no es json", False)
    gateway.manejar_mensaje("feeder/f1/status", b"", True)        # retained borrado

    assert gateway.store.status("f1")["hopperDogPct"] == 72.0
    cola = gateway.store.primeros(10)
    assert [(i.tipo, i.payload["eventId"], i.payload["feederId"]) for i in cola] == \
        [("visit", "u1", "f1"), ("event", "u2", "f1")]


async def test_estado_health(gateway):
    estado = gateway.estado()
    assert estado["backendOnline"] is False and estado["queue"] == 0
    assert gateway.host_lan() == "192.168.1.50"
    assert gateway.cfg.backend.url == "https://api.test"
