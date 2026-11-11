"""Servidor HTTP en la LAN (puerto 8080) para los ESP32.

GET  /ota/<archivo>  artefactos OTA ya verificados
POST /photos         foto dudosa (image/jpeg); se guarda y se sube a Blob Storage vía la cola
GET  /health         para que el ESP32 sepa si la Pi responde
"""
from __future__ import annotations

import hashlib
import logging
import math
import os
from pathlib import Path
from typing import Any, Callable

from aiohttp import web

from . import mapping
from .ota import GestorOta

log = logging.getLogger(__name__)

Encolar = Callable[[str, dict[str, Any]], Any]
Estado = Callable[[], dict[str, Any]]


def _error(status: int, mensaje: str) -> web.Response:
    return web.json_response({"error": mensaje}, status=status)


def crear_app(ota: GestorOta, directorio_fotos: Path, encolar: Encolar, estado: Estado,
              max_foto: int = 2 * 1024 * 1024) -> web.Application:
    app = web.Application(client_max_size=max_foto + 1024)
    directorio_fotos = Path(directorio_fotos)

    async def get_ota(request: web.Request) -> web.StreamResponse:
        ruta = ota.ruta(request.match_info["archivo"])
        if ruta is None:
            return _error(404, "no existe")
        log.info("OTA %s solicitado por %s", ruta.name, request.remote)
        return web.FileResponse(ruta, headers={"Content-Type": "application/octet-stream"})

    async def post_photos(request: web.Request) -> web.Response:
        q = request.query
        feeder_id = q.get("feederId", "")
        event_id = q.get("eventId", "")
        if not mapping.FEEDER_ID_RE.match(feeder_id):
            return _error(400, "feederId inválido")
        if not event_id or len(event_id) > 64:
            return _error(400, "eventId inválido")
        clase = next((c for c in mapping.CLASES if c.lower() == q.get("class", "").lower()), None)
        if clase is None:
            return _error(400, "class inválida")
        try:
            confianza = float(q.get("confidence", ""))
            tomada = int(q.get("takenAt", ""))
        except ValueError:
            return _error(400, "confidence/takenAt inválidos")
        if not math.isfinite(confianza) or not 0.0 <= confianza <= 1.0:
            return _error(400, "confidence fuera de rango")
        if tomada < mapping.TIEMPO_MINIMO_VALIDO:
            return _error(400, "takenAt inválido")
        if request.content_type not in ("image/jpeg", "image/jpg"):
            return _error(415, "se esperaba image/jpeg")
        if request.content_length is not None and request.content_length > max_foto:
            return _error(413, "foto demasiado grande")
        try:
            cuerpo = await request.read()
        except web.HTTPRequestEntityTooLarge:
            return _error(413, "foto demasiado grande")
        if len(cuerpo) < 4 or cuerpo[:2] != b"\xff\xd8":
            return _error(400, "el cuerpo no es un JPEG")

        directorio_fotos.mkdir(parents=True, exist_ok=True)
        clave = hashlib.sha1(f"{feeder_id}/{event_id}".encode()).hexdigest()[:20]
        destino = directorio_fotos / f"{feeder_id}_{clave}.jpg"
        temporal = destino.with_suffix(".part")
        temporal.write_bytes(cuerpo)
        os.replace(temporal, destino)
        encolar("photo", {
            "feederId": feeder_id, "eventId": event_id, "class": clase,
            "confidence": confianza, "takenAt": tomada, "archivo": str(destino),
        })
        log.info("Foto dudosa %s/%s recibida (%d bytes)", feeder_id, event_id, len(cuerpo))
        return web.json_response({"queued": True}, status=202)

    async def get_health(request: web.Request) -> web.Response:
        return web.json_response({"ok": True, **estado()})

    app.router.add_get("/ota/{archivo}", get_ota)
    app.router.add_post("/photos", post_photos)
    app.router.add_get("/health", get_health)
    return app
