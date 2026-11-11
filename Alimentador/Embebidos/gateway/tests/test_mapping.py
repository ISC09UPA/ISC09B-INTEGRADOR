import pytest

from alimentador_gateway import mapping
from alimentador_gateway.mapping import PayloadInvalido

AHORA = 1_794_350_000


def test_tema():
    assert mapping.feeder_de_tema("feeder/feeder01/status") == ("feeder01", "status")
    assert mapping.feeder_de_tema("feeder/a-b_1/cmd/result") == ("a-b_1", "cmd/result")
    assert mapping.feeder_de_tema("feeder/a.b/status") is None
    assert mapping.feeder_de_tema("gateway/time") is None


def test_status_completo():
    datos = {"online": True, "hopperDogPct": 72.0, "hopperCatPct": 40.5, "plateDogG": 3.1, "plateCatG": 0.0,
             "firmware": "1.2.0", "model": "2026.11.1", "reportedAt": AHORA - 10}
    estado = mapping.status_a_estado("feeder01", datos, None, AHORA)
    assert estado == {"feederId": "feeder01", "online": True, "hopperDogPct": 72.0, "hopperCatPct": 40.5,
                      "plateDogG": 3.1, "plateCatG": 0.0, "firmware": "1.2.0", "model": "2026.11.1",
                      "reportedAt": AHORA - 10}


def test_status_lwt_conserva_niveles_y_usa_hora_de_la_pi():
    anterior = mapping.status_a_estado("f", {"online": True, "hopperDogPct": 50, "firmware": "1.0.0",
                                             "reportedAt": AHORA - 100}, None, AHORA)
    estado = mapping.status_a_estado("f", {"online": False}, anterior, AHORA)
    assert estado["online"] is False
    assert estado["hopperDogPct"] == 50
    assert estado["firmware"] == "1.0.0"
    assert estado["reportedAt"] == AHORA


def test_status_reloj_esp32_sin_sincronizar():
    estado = mapping.status_a_estado("f", {"online": True, "reportedAt": 12}, None, AHORA)
    assert estado["reportedAt"] == AHORA


def test_status_sin_online():
    with pytest.raises(PayloadInvalido):
        mapping.status_a_estado("f", {"hopperDogPct": 1}, None, AHORA)


def visita(**cambios):
    datos = {"eventId": "boot42-0007", "petId": 3, "class": "Gato", "confidence": 0.93,
             "startedAt": AHORA - 300, "endedAt": AHORA - 10, "plateBeforeG": 3.1, "dispensedG": 31.2,
             "plateAfterG": 5.0}
    datos.update(cambios)
    return datos


def test_visita_a_dto():
    dto = mapping.visita_a_dto("feeder01", visita(), AHORA)
    assert dto == {"feederId": "feeder01", "eventId": "boot42-0007", "petId": 3, "class": "Gato",
                   "confidence": 0.93, "startedAt": AHORA - 300, "endedAt": AHORA - 10,
                   "plateBeforeG": 3.1, "dispensedG": 31.2, "plateAfterG": 5.0}
    assert list(dto) == ["feederId", "eventId", "petId", "class", "confidence", "startedAt", "endedAt",
                         "plateBeforeG", "dispensedG", "plateAfterG"]


def test_visita_normaliza_clase_y_pet_nulo():
    dto = mapping.visita_a_dto("f", visita(**{"class": "paloma", "petId": None}), AHORA)
    assert dto["class"] == "Paloma" and dto["petId"] is None


@pytest.mark.parametrize("cambios", [
    {"class": "Raton"},
    {"confidence": 1.5},
    {"eventId": None},
    {"eventId": "x" * 65},
    {"startedAt": 5},
    {"endedAt": AHORA - 400},
    {"dispensedG": None},
    {"plateAfterG": "5"},
    {"petId": 2.5},
    {"startedAt": True},
])
def test_visita_invalida(cambios):
    with pytest.raises(PayloadInvalido):
        mapping.visita_a_dto("f", visita(**cambios), AHORA)


def test_evento_a_dto():
    dto = mapping.evento_a_dto("f", {"eventId": "e1", "type": "hopper_low", "occurredAt": AHORA,
                                     "detail": 17, "hopper": 2}, AHORA)
    assert dto == {"feederId": "f", "eventId": "e1", "type": "HOPPER_LOW", "occurredAt": AHORA,
                   "detail": "17", "hopper": 2}
    dto = mapping.evento_a_dto("f", {"eventId": "e2", "type": "JAM", "occurredAt": AHORA}, AHORA)
    assert dto["detail"] is None and dto["hopper"] is None


@pytest.mark.parametrize("cambios", [{"type": "FIRE"}, {"hopper": 3}, {"occurredAt": None}])
def test_evento_invalido(cambios):
    datos = {"eventId": "e1", "type": "JAM", "occurredAt": AHORA, "hopper": 1}
    datos.update(cambios)
    with pytest.raises(PayloadInvalido):
        mapping.evento_a_dto("f", datos, AHORA)


def test_resultado():
    assert mapping.resultado_a_dto({"id": 15, "ok": True, "dispensedG": 29.8, "error": None}) == \
        (15, {"ok": True, "dispensedG": 29.8, "error": None})
    assert mapping.resultado_a_dto({"id": 16, "ok": False}) == (16, {"ok": False, "dispensedG": None,
                                                                     "error": "error"})
    with pytest.raises(PayloadInvalido):
        mapping.resultado_a_dto({"id": 15})


def test_comando_dispensar():
    cmd = {"id": 15, "feederId": "f", "type": "dispense", "grams": 30.0, "petId": 3, "hopper": 2,
           "url": None, "sha256": None}
    assert mapping.comando_dispensar_a_mqtt(cmd) == {"id": 15, "type": "dispense", "grams": 30.0,
                                                     "petId": 3, "hopper": 2}


@pytest.mark.parametrize("blob,esperado", [
    ("firmware/1.3.0/feeder.bin", ("firmware", "1.3.0")),
    ("feeder-firmware-1.3.0.bin", ("firmware", "1.3.0")),
    ("model/2026.11.1/model.tflite", ("model", "2026.11.1")),
    ("modelo-2026.11.1.tflite", ("model", "2026.11.1")),
    ("sin-version.bin", ("firmware", None)),
])
def test_inferir_artefacto(blob, esperado):
    assert mapping.inferir_artefacto({}, blob) == esperado


def test_inferir_artefacto_respeta_campos_del_backend():
    assert mapping.inferir_artefacto({"target": "model", "version": "9"}, "x.bin") == ("model", "9")


def test_configs_por_feeder():
    resp = {"feeders": [{"feederId": "f1", "version": 3, "minIntervalHours": 4,
                         "timeZone": "America/Mexico_City", "pets": [], "schedules": []},
                        {"feederId": "mal/id", "version": 1}]}
    assert list(mapping.configs_por_feeder(resp)) == ["f1"]
    with pytest.raises(PayloadInvalido):
        mapping.configs_por_feeder({})
