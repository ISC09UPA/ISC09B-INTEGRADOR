"""Traducción entre los payloads MQTT del ESP32 y los DTOs de /api/device.

Funciones puras (sin E/S) para poder probarlas a fondo. Nombres de campo idénticos a
DispositivoDtos.cs (camelCase); tiempos Unix en segundos.
"""
from __future__ import annotations

import json
import re
from typing import Any

FEEDER_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
CLASES = ("Perro", "Gato", "Nada")
TIPOS_EVENTO = ("JAM", "HOPPER_LOW")
TOLVAS = (1, 2)  # 1 = perro, 2 = gato
# Antes de esta fecha (2023-11-14) el reloj del ESP32 no está sincronizado
TIEMPO_MINIMO_VALIDO = 1_700_000_000


class PayloadInvalido(ValueError):
    pass


def feeder_de_tema(tema: str) -> tuple[str, str] | None:
    """'feeder/abc/cmd/result' -> ('abc', 'cmd/result'). None si no es un tema de alimentador."""
    partes = tema.split("/")
    if len(partes) < 3 or partes[0] != "feeder" or not FEEDER_ID_RE.match(partes[1]):
        return None
    return partes[1], "/".join(partes[2:])


def decodificar(payload: bytes | str) -> dict[str, Any]:
    try:
        datos = json.loads(payload)
    except (ValueError, UnicodeDecodeError) as e:
        raise PayloadInvalido(f"JSON inválido: {e}") from e
    if not isinstance(datos, dict):
        raise PayloadInvalido("se esperaba un objeto JSON")
    return datos


def codificar(datos: dict[str, Any]) -> bytes:
    return json.dumps(datos, separators=(",", ":"), ensure_ascii=False).encode()


# ---------------- validación de campos ----------------

def _num(datos: dict, campo: str, requerido: bool = True) -> float | None:
    valor = datos.get(campo)
    if valor is None:
        if requerido:
            raise PayloadInvalido(f"falta '{campo}'")
        return None
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise PayloadInvalido(f"'{campo}' debe ser numérico")
    return float(valor)


def _entero(datos: dict, campo: str, requerido: bool = True) -> int | None:
    valor = datos.get(campo)
    if valor is None:
        if requerido:
            raise PayloadInvalido(f"falta '{campo}'")
        return None
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or int(valor) != valor:
        raise PayloadInvalido(f"'{campo}' debe ser entero")
    return int(valor)


def _texto(datos: dict, campo: str, requerido: bool = True) -> str | None:
    valor = datos.get(campo)
    if valor is None or valor == "":
        if requerido:
            raise PayloadInvalido(f"falta '{campo}'")
        return None
    if not isinstance(valor, str):
        raise PayloadInvalido(f"'{campo}' debe ser texto")
    return valor


def _tiempo(datos: dict, campo: str, ahora: int) -> int:
    t = _entero(datos, campo)
    if t < TIEMPO_MINIMO_VALIDO:
        raise PayloadInvalido(f"'{campo}' fuera de rango (¿reloj del ESP32 sin sincronizar?)")
    if t > ahora + 24 * 3600:
        raise PayloadInvalido(f"'{campo}' está en el futuro")
    return t


def _event_id(datos: dict) -> str:
    event_id = _texto(datos, "eventId")
    if len(event_id) > 64:
        raise PayloadInvalido("'eventId' tiene más de 64 caracteres")
    return event_id


# ---------------- ESP32 -> backend ----------------

def status_a_estado(feeder_id: str, datos: dict[str, Any], anterior: dict[str, Any] | None,
                    ahora: int) -> dict[str, Any]:
    """feeder/{id}/status -> EstadoFeederDto.

    El LWT trae solo {"online": false}: se conservan los últimos niveles conocidos y se usa
    la hora de la Pi. Si el ESP32 aún no tiene hora válida también se usa la de la Pi.
    """
    online = datos.get("online")
    if not isinstance(online, bool):
        raise PayloadInvalido("falta 'online' (bool)")

    base = dict(anterior or {})
    estado: dict[str, Any] = {
        "feederId": feeder_id,
        "online": online,
        "hopperDogPct": base.get("hopperDogPct"),
        "hopperCatPct": base.get("hopperCatPct"),
        "plateDogG": base.get("plateDogG"),
        "plateCatG": base.get("plateCatG"),
        "firmware": base.get("firmware"),
        "model": base.get("model"),
    }
    for campo in ("hopperDogPct", "hopperCatPct", "plateDogG", "plateCatG"):
        if campo in datos:
            estado[campo] = _num(datos, campo, requerido=False)
    for campo in ("firmware", "model"):
        if campo in datos:
            estado[campo] = _texto(datos, campo, requerido=False) or estado[campo]

    reportado = datos.get("reportedAt")
    if (isinstance(reportado, (int, float)) and not isinstance(reportado, bool)
            and TIEMPO_MINIMO_VALIDO <= reportado <= ahora + 300):
        estado["reportedAt"] = int(reportado)
    else:
        estado["reportedAt"] = ahora
    return estado


def visita_a_dto(feeder_id: str, datos: dict[str, Any], ahora: int) -> dict[str, Any]:
    """feeder/{id}/visit -> VisitaDispositivoDto."""
    clase = _texto(datos, "class")
    normalizada = next((c for c in CLASES if c.lower() == clase.lower()), None)
    if normalizada is None:
        raise PayloadInvalido(f"'class' debe ser uno de {', '.join(CLASES)}")
    confianza = _num(datos, "confidence")
    if not 0.0 <= confianza <= 1.0:
        raise PayloadInvalido("'confidence' debe estar entre 0 y 1")
    inicio = _tiempo(datos, "startedAt", ahora)
    fin = _tiempo(datos, "endedAt", ahora)
    if fin < inicio:
        raise PayloadInvalido("'endedAt' es anterior a 'startedAt'")
    return {
        "feederId": feeder_id,
        "eventId": _event_id(datos),
        "petId": _entero(datos, "petId", requerido=False),
        "class": normalizada,
        "confidence": confianza,
        "startedAt": inicio,
        "endedAt": fin,
        "plateBeforeG": _num(datos, "plateBeforeG"),
        "dispensedG": _num(datos, "dispensedG"),
        "plateAfterG": _num(datos, "plateAfterG"),
    }


def evento_a_dto(feeder_id: str, datos: dict[str, Any], ahora: int) -> dict[str, Any]:
    """feeder/{id}/event -> EventoDispositivoDto."""
    tipo = _texto(datos, "type").upper()
    if tipo not in TIPOS_EVENTO:
        raise PayloadInvalido(f"'type' debe ser uno de {', '.join(TIPOS_EVENTO)}")
    tolva = _entero(datos, "hopper", requerido=False)
    if tolva is not None and tolva not in TOLVAS:
        raise PayloadInvalido("'hopper' debe ser 1 (perro) o 2 (gato)")
    detalle = datos.get("detail")
    if detalle is not None and not isinstance(detalle, str):
        detalle = json.dumps(detalle) if isinstance(detalle, (dict, list)) else str(detalle)
    return {
        "feederId": feeder_id,
        "eventId": _event_id(datos),
        "type": tipo,
        "occurredAt": _tiempo(datos, "occurredAt", ahora),
        "detail": detalle[:500] if detalle else None,
        "hopper": tolva,
    }


def resultado_a_dto(datos: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    """feeder/{id}/cmd/result -> (id del comando, ResultadoComandoRequest)."""
    comando_id = _entero(datos, "id")
    ok = datos.get("ok")
    if not isinstance(ok, bool):
        raise PayloadInvalido("falta 'ok' (bool)")
    error = datos.get("error")
    if error is not None and not isinstance(error, str):
        error = str(error)
    return comando_id, {
        "ok": ok,
        "dispensedG": _num(datos, "dispensedG", requerido=False),
        "error": None if ok and not error else (error or "error"),
    }


def resultado_local(ok: bool, error: str | None = None, dispensado: float | None = None) -> dict[str, Any]:
    """ResultadoComandoRequest generado por la propia Pi (timeout, vencido, SHA-256...)."""
    return {"ok": ok, "dispensedG": dispensado, "error": error}


# ---------------- backend -> ESP32 ----------------

def comando_dispensar_a_mqtt(cmd: dict[str, Any]) -> dict[str, Any]:
    """ComandoDispositivoDto (type=dispense) -> payload de feeder/{id}/cmd."""
    return {
        "id": int(cmd["id"]),
        "type": "dispense",
        "grams": cmd.get("grams"),
        "petId": cmd.get("petId"),
        "hopper": cmd.get("hopper"),
    }


def comando_ota_a_mqtt(cmd: dict[str, Any], url_lan: str, target: str, version: str | None) -> dict[str, Any]:
    """ComandoDispositivoDto (type=ota) -> payload de feeder/{id}/cmd con la URL de la LAN."""
    return {
        "id": int(cmd["id"]),
        "type": "ota",
        "target": target,
        "url": url_lan,
        "sha256": str(cmd["sha256"]).lower(),
        "version": version,
    }


_VERSION_RE = re.compile(r"(\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.]+)?)")


def inferir_artefacto(cmd: dict[str, Any], nombre_blob: str) -> tuple[str, str | None]:
    """Obtiene (target, version) de una OTA.

    ComandoDispositivoDto no trae el tipo ni la versión del artefacto, así que se usan
    'target'/'version' si algún día el backend los agrega, y si no se deducen del nombre
    del blob (convención: 'firmware/1.3.0/feeder.bin', 'model-2026.11.1.tflite', ...).
    """
    target = cmd.get("target")
    version = cmd.get("version")
    ruta = nombre_blob.lower()
    if target not in ("firmware", "model"):
        es_modelo = (any(p in ruta for p in ("model", "modelo"))
                     or ruta.endswith((".tflite", ".onnx", ".espdl", ".pte")))
        target = "model" if es_modelo else "firmware"
    if not version:
        encontrada = _VERSION_RE.findall(nombre_blob)
        version = encontrada[-1] if encontrada else None
        if version and version.lower().endswith((".bin", ".tflite", ".onnx")):
            version = version.rsplit(".", 1)[0]
    return target, version


def configs_por_feeder(respuesta: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """ConfiguracionDispositivoDto -> {feederId: ConfigAlimentadorDto}."""
    feeders = respuesta.get("feeders")
    if not isinstance(feeders, list):
        raise PayloadInvalido("la respuesta de config no trae 'feeders'")
    resultado = {}
    for f in feeders:
        if isinstance(f, dict) and isinstance(f.get("feederId"), str) and FEEDER_ID_RE.match(f["feederId"]):
            resultado[f["feederId"]] = f
    return resultado
