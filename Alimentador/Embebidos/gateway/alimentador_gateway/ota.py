"""Artefactos OTA: descarga desde la URL SAS, verificación SHA-256 y publicación en la LAN."""
from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Any, Callable
from urllib.parse import unquote, urlsplit

from . import mapping
from .backend import BackendClient

log = logging.getLogger(__name__)

NOMBRE_SEGURO_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
CONTENEDOR_OTA = "ota"


def nombre_blob(url_sas: str) -> str:
    """'https://x.blob.core.windows.net/ota/firmware/1.3.0/a.bin?sv=..' -> 'firmware/1.3.0/a.bin'."""
    ruta = unquote(urlsplit(url_sas).path).lstrip("/")
    partes = ruta.split("/")
    # Azurite incluye la cuenta en la ruta: /devstoreaccount1/ota/...
    if CONTENEDOR_OTA in partes:
        partes = partes[partes.index(CONTENEDOR_OTA) + 1:]
    return "/".join(partes)


def sha256_archivo(ruta: Path) -> str:
    h = hashlib.sha256()
    with ruta.open("rb") as f:
        for bloque in iter(lambda: f.read(64 * 1024), b""):
            h.update(bloque)
    return h.hexdigest()


class GestorOta:
    def __init__(self, directorio: Path, backend: BackendClient, host_lan: Callable[[], str], puerto: int,
                 conservar: int = 6):
        self.directorio = Path(directorio)
        self.backend = backend
        self.host_lan = host_lan
        self.puerto = puerto
        self.conservar = conservar

    def nombre_local(self, cmd: dict[str, Any]) -> str:
        """Nombre en /var/lib/alimentador/ota: prefijo del SHA-256 + nombre del blob saneado."""
        base = nombre_blob(cmd["url"]).rsplit("/", 1)[-1] or "artefacto.bin"
        base = re.sub(r"[^A-Za-z0-9._-]", "_", base).lstrip("._-")[:100] or "artefacto.bin"
        return f"{str(cmd['sha256']).lower()[:12]}-{base}"

    def url_lan(self, nombre: str) -> str:
        return f"http://{self.host_lan()}:{self.puerto}/ota/{nombre}"

    def ruta(self, nombre: str) -> Path | None:
        """Ruta segura de un archivo servido en /ota/<archivo>; None si el nombre no es válido."""
        if not NOMBRE_SEGURO_RE.match(nombre) or nombre.endswith(".part"):
            return None
        ruta = self.directorio / nombre
        return ruta if ruta.is_file() else None

    async def preparar(self, cmd: dict[str, Any]) -> dict[str, Any]:
        """Descarga y verifica el artefacto; devuelve el payload de feeder/{id}/cmd."""
        url = cmd.get("url")
        sha = str(cmd.get("sha256") or "")
        if not url or not SHA256_RE.match(sha):
            raise ValueError("comando OTA sin url o sha256 válidos")
        self.directorio.mkdir(parents=True, exist_ok=True)
        nombre = self.nombre_local(cmd)
        destino = self.directorio / nombre
        if destino.is_file() and sha256_archivo(destino) == sha.lower():
            log.info("Artefacto %s ya estaba descargado", nombre)
        else:
            tamano = await self.backend.descargar(url, destino, sha)
            log.info("Artefacto %s descargado (%d bytes, SHA-256 verificado)", nombre, tamano)
        self.limpiar(excepto=nombre)
        target, version = mapping.inferir_artefacto(cmd, nombre_blob(url))
        return mapping.comando_ota_a_mqtt(cmd, self.url_lan(nombre), target, version)

    def limpiar(self, excepto: str | None = None) -> None:
        """Conserva solo los artefactos más recientes."""
        if not self.directorio.is_dir():
            return
        archivos = sorted((p for p in self.directorio.iterdir() if p.is_file()),
                          key=lambda p: p.stat().st_mtime, reverse=True)
        for viejo in archivos[self.conservar:]:
            if viejo.name != excepto:
                viejo.unlink(missing_ok=True)
