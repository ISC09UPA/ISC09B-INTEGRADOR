"""Sincronización con el backend.

- Detecta internet con GET /health.
- Al volver internet manda un heartbeat con offlineSince, vacía la cola en orden y
  termina con sync-complete (RF-26).
- Heartbeat periódico con el último status de cada ESP32.
- Poll de config?version=N (respeta 204) y publicación retained en feeder/{id}/config.
- Poll de comandos pendientes (se entregan al gestor de comandos).

Todo lo que se reporta al backend (visitas, eventos, resultados de comandos y fotos)
pasa por la cola persistente de SQLite. El heartbeat y sync-complete son mensajes de
control: el heartbeat es una foto del estado actual y no tiene sentido reenviar uno viejo.
"""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Awaitable, Callable

from . import mapping
from .backend import BackendClient, BackendError
from .config import BackendConfig
from .store import ItemCola, Store
from .util import Reloj, backoff, esperar_evento

log = logging.getLogger(__name__)

Publicar = Callable[[str, bytes, bool], Awaitable[bool]]

ESTADO_OFFLINE = "offline_since"
ESTADO_SYNC = "sync_pendiente"
ESTADO_VERSION = "config_version"


class Sincronizador:
    def __init__(self, cfg: BackendConfig, store: Store, backend: BackendClient, publicar: Publicar,
                 reloj: Reloj | None = None):
        self.cfg = cfg
        self.store = store
        self.backend = backend
        self.publicar = publicar
        self.reloj = reloj or Reloj()
        self.en_linea = False
        self.recibir_comando: Callable[[dict[str, Any]], None] | None = None
        self._despertar_cola = asyncio.Event()
        self._despertar_heartbeat = asyncio.Event()
        self._fallos_cola = 0
        self._ultima_config_completa = 0.0
        self.ultimo_error: str | None = None

    # ---------------- API para el resto del gateway ----------------

    def encolar(self, tipo: str, payload: dict[str, Any]) -> int:
        item = self.store.encolar(tipo, payload, self.reloj.ahora())
        self._despertar_cola.set()
        return item

    def pedir_heartbeat(self) -> None:
        self._despertar_heartbeat.set()

    def iniciar(self) -> None:
        """Al arrancar no se sabe si hubo datos atrasados: se cierra con sync-complete (es inocuo)."""
        self.store.guardar(ESTADO_SYNC, True)

    async def run(self) -> None:
        self.iniciar()
        await asyncio.gather(
            self._bucle_conectividad(),
            self._bucle_cola(),
            self._bucle_heartbeat(),
            self._bucle_config(),
            self._bucle_comandos(),
        )

    # ---------------- conectividad ----------------

    def marcar_sin_red(self, motivo: str = "") -> None:
        if self.store.obtener(ESTADO_OFFLINE) is None:
            self.store.guardar(ESTADO_OFFLINE, self.reloj.ahora())
        if self.en_linea:
            log.warning("Sin conexión con el backend %s", motivo)
        self.en_linea = False

    async def comprobar_conexion(self) -> bool:
        if await self.backend.health():
            if not self.en_linea:
                await self._al_volver()
        else:
            self.marcar_sin_red("(GET /health falló)")
        return self.en_linea

    async def _al_volver(self) -> None:
        offline_since = self.store.obtener(ESTADO_OFFLINE)
        try:
            await self.enviar_heartbeat(offline_since)
        except BackendError as e:
            self.ultimo_error = str(e)
            if e.status in (401, 403):
                log.error("El backend rechazó X-Device-Id/X-Device-Key: %s", e)
            if e.sin_red:
                self.marcar_sin_red(str(e))
            return
        self.store.borrar(ESTADO_OFFLINE)
        self.store.guardar(ESTADO_SYNC, True)
        self.en_linea = True
        self._fallos_cola = 0
        log.info("Conexión con el backend restablecida (offlineSince=%s, %d pendientes)",
                 offline_since, self.store.tamano_cola())
        self._despertar_cola.set()

    async def _bucle_conectividad(self) -> None:
        while True:
            try:
                await self.comprobar_conexion()
            except Exception:  # noqa: BLE001 - el bucle no debe morir
                log.exception("Error comprobando la conexión")
            await asyncio.sleep(self.cfg.health_interval)

    # ---------------- heartbeat ----------------

    async def enviar_heartbeat(self, offline_since: int | None = None) -> None:
        feeders = self.store.todos_los_status()
        resp = await self.backend.heartbeat(feeders, offline_since)
        server_time = resp.get("serverTime") if isinstance(resp, dict) else None
        if isinstance(server_time, int):
            self.reloj.ajustar(server_time)

    async def _bucle_heartbeat(self) -> None:
        while True:
            await esperar_evento(self._despertar_heartbeat, self.cfg.heartbeat_interval)
            if not self.en_linea:
                continue
            try:
                await self.enviar_heartbeat(None)
            except BackendError as e:
                self.ultimo_error = str(e)
                log.warning("Heartbeat falló: %s", e)
                if e.sin_red:
                    self.marcar_sin_red(str(e))

    # ---------------- cola ----------------

    async def vaciar_una_vez(self) -> bool:
        """Envía el siguiente lote. True si avanzó, False si la cola está vacía o hubo fallo."""
        lote = self.store.lote_inicial(self.cfg.batch_size)
        if not lote:
            if self.store.obtener(ESTADO_SYNC):
                await self.backend.sync_complete()
                self.store.guardar(ESTADO_SYNC, False)
                log.info("Cola vacía: sync-complete enviado")
            return False
        try:
            await self._enviar(lote)
        except BackendError as e:
            if not e.definitivo:
                raise
            if len(lote) == 1:
                log.error("El backend rechazó %s #%d de forma definitiva: %s", lote[0].tipo, lote[0].id, e)
                self._descartar(lote, str(e))
            else:
                # Un registro malo no debe tirar el lote: se mandan de uno en uno
                await self._enviar_uno_a_uno(lote)
        self._fallos_cola = 0
        return True

    async def _enviar_uno_a_uno(self, lote: list[ItemCola]) -> None:
        for item in lote:
            try:
                await self._enviar([item])
            except BackendError as e:
                if not e.definitivo:
                    raise
                log.error("El backend rechazó %s #%d de forma definitiva: %s", item.tipo, item.id, e)
                self._descartar([item], str(e))

    def _descartar(self, items: list[ItemCola], motivo: str) -> None:
        for item in items:
            if item.tipo == "photo":
                Path(item.payload.get("archivo", "")).unlink(missing_ok=True)
        self.store.descartar([i.id for i in items], motivo)

    async def _enviar(self, lote: list[ItemCola]) -> None:
        tipo = lote[0].tipo
        ids = [i.id for i in lote]
        if tipo in ("visit", "event"):
            enviar = self.backend.visitas if tipo == "visit" else self.backend.eventos
            resp = await enviar([i.payload for i in lote])
            if isinstance(resp, dict) and resp.get("rechazados"):
                log.warning("%s: el backend rechazó %s de %d registros (recibidos=%s, duplicados=%s)",
                            tipo, resp.get("rechazados"), len(lote), resp.get("recibidos"), resp.get("duplicados"))
            self.store.quitar(ids)
        elif tipo == "result":
            p = lote[0].payload
            await self.backend.resultado_comando(p["commandId"], p["result"])
            self.store.quitar(ids)
        elif tipo == "photo":
            await self._subir_foto(lote[0])
        else:
            self._descartar(lote, f"tipo desconocido {tipo}")

    async def _subir_foto(self, item: ItemCola) -> None:
        p = item.payload
        archivo = Path(p["archivo"])
        if not archivo.exists():
            log.warning("La foto %s ya no existe; se descarta", archivo)
            self.store.descartar([item.id], "archivo inexistente")
            return
        sas = await self.backend.solicitar_foto({
            "feederId": p["feederId"], "eventId": p["eventId"], "class": p["class"],
            "confidence": p["confidence"], "takenAt": p["takenAt"],
        })
        await self.backend.subir_blob(sas["uploadUrl"], archivo.read_bytes(), "image/jpeg")
        await self.backend.confirmar_foto(p["feederId"], p["eventId"])
        self.store.quitar([item.id])
        archivo.unlink(missing_ok=True)
        log.info("Foto %s/%s subida como %s", p["feederId"], p["eventId"], sas.get("blobName"))

    async def _bucle_cola(self) -> None:
        while True:
            if not self.en_linea:
                await esperar_evento(self._despertar_cola, 5)
                continue
            try:
                avanzo = await self.vaciar_una_vez()
            except BackendError as e:
                self._fallos_cola += 1
                self.ultimo_error = str(e)
                lote = self.store.lote_inicial(1)
                if lote:
                    self.store.marcar_fallo([lote[0].id], str(e))
                if e.sin_red:
                    self.marcar_sin_red(str(e))
                espera = backoff(self._fallos_cola, self.cfg.backoff_base, self.cfg.backoff_max)
                log.warning("Envío al backend falló (intento %d), reintento en %.0f s: %s",
                            self._fallos_cola, espera, e)
                await asyncio.sleep(espera)
                continue
            except Exception:  # noqa: BLE001
                log.exception("Error inesperado vaciando la cola")
                self._fallos_cola += 1
                await asyncio.sleep(backoff(self._fallos_cola, self.cfg.backoff_base, self.cfg.backoff_max))
                continue
            if not avanzo:
                await esperar_evento(self._despertar_cola, 30)

    # ---------------- configuración ----------------

    async def actualizar_config(self, completa: bool = False) -> bool:
        """Poll de config. Devuelve True si hubo cambios."""
        version = 0 if completa else int(self.store.obtener(ESTADO_VERSION, 0))
        resp = await self.backend.config(version)
        if resp is None:
            return False
        nuevas = mapping.configs_por_feeder(resp)
        actuales = self.store.configs()
        for feeder_id, config in nuevas.items():
            if actuales.get(feeder_id) != config:
                self.store.guardar_config(feeder_id, int(config.get("version", 0)), config)
                await self._publicar_config(feeder_id, config)
                log.info("Config de %s actualizada a la versión %s", feeder_id, config.get("version"))
        # La respuesta trae todos los alimentadores del gateway: los que faltan se desligaron
        for feeder_id in set(actuales) - set(nuevas):
            self.store.borrar_config(feeder_id)
            await self.publicar(f"feeder/{feeder_id}/config", b"", True)
            log.info("%s ya no está ligado a este gateway; se borra su config", feeder_id)
        maxima = max((int(c.get("version", 0)) for c in nuevas.values()), default=0)
        self.store.guardar(ESTADO_VERSION, maxima)
        return True

    async def _publicar_config(self, feeder_id: str, config: dict[str, Any]) -> None:
        if not await self.publicar(f"feeder/{feeder_id}/config", mapping.codificar(config), True):
            log.warning("MQTT no disponible; la config de %s se publicará al reconectar", feeder_id)

    async def republicar_configs(self) -> None:
        """Al (re)conectar a MQTT se vuelven a publicar las configs guardadas (retained)."""
        for feeder_id, config in self.store.configs().items():
            await self._publicar_config(feeder_id, config)

    async def _bucle_config(self) -> None:
        while True:
            if self.en_linea:
                ahora = asyncio.get_running_loop().time()
                completa = ahora - self._ultima_config_completa >= self.cfg.config_full_refresh
                try:
                    await self.actualizar_config(completa)
                    if completa:
                        self._ultima_config_completa = ahora
                except BackendError as e:
                    log.warning("No se pudo obtener la config: %s", e)
                    if e.sin_red:
                        self.marcar_sin_red(str(e))
                except mapping.PayloadInvalido as e:
                    log.error("Config inválida del backend: %s", e)
            await asyncio.sleep(self.cfg.config_interval)

    # ---------------- comandos ----------------

    async def obtener_comandos(self) -> int:
        comandos = await self.backend.comandos()
        for cmd in comandos:
            if self.recibir_comando is not None:
                self.recibir_comando(cmd)
        return len(comandos)

    async def _bucle_comandos(self) -> None:
        while True:
            if self.en_linea:
                try:
                    await self.obtener_comandos()
                except BackendError as e:
                    log.warning("No se pudieron obtener los comandos: %s", e)
                    if e.sin_red:
                        self.marcar_sin_red(str(e))
            await asyncio.sleep(self.cfg.commands_interval)
