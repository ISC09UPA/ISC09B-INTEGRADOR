"""Ensambla el gateway: MQTT + backend + cola + comandos + servidor LAN."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from aiohttp import web

from . import __version__, mapping
from .backend import BackendClient
from .commands import GestorComandos
from .config import Config
from .lan import crear_app
from .mqtt import PuenteMqtt
from .ota import GestorOta
from .store import Store
from .sync import Sincronizador
from .util import Reloj, ip_lan

log = logging.getLogger(__name__)


class Gateway:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.reloj = Reloj()
        for d in (cfg.paths.data_dir, cfg.paths.ota_dir, cfg.paths.photos_dir):
            d.mkdir(parents=True, exist_ok=True)
        self.store = Store(cfg.paths.db_path)
        self.backend = BackendClient(cfg.backend.url, cfg.backend.device_id, cfg.backend.device_key,
                                     cfg.backend.timeout)
        self.mqtt = PuenteMqtt(cfg.mqtt, self.manejar_mensaje, self._al_conectar_mqtt)
        self.sync = Sincronizador(cfg.backend, self.store, self.backend, self.mqtt.publicar, self.reloj)
        self._host_lan = cfg.lan.public_host or None
        self.ota = GestorOta(cfg.paths.ota_dir, self.backend, self.host_lan, cfg.lan.port)
        self.comandos = GestorComandos(cfg.commands, self.store, self.mqtt.publicar, self.sync.encolar,
                                       self.ota, self.reloj)
        self.sync.recibir_comando = self.comandos.recibir

    def host_lan(self) -> str:
        if self._host_lan is None:
            self._host_lan = ip_lan()
            log.info("IP de la Pi en la LAN: %s", self._host_lan)
        return self._host_lan

    # ---------------- MQTT -> gateway ----------------

    def manejar_mensaje(self, tema: str, payload: bytes, retain: bool) -> None:
        partes = mapping.feeder_de_tema(tema)
        if partes is None:
            return
        feeder_id, subtema = partes
        if not payload:
            return  # retained borrado
        ahora = self.reloj.ahora()
        try:
            datos = mapping.decodificar(payload)
            if subtema == "status":
                anterior = self.store.status(feeder_id)
                estado = mapping.status_a_estado(feeder_id, datos, anterior, ahora)
                self.store.guardar_status(feeder_id, estado)
                if anterior is None or anterior.get("online") != estado["online"]:
                    log.info("%s %s", feeder_id, "en línea" if estado["online"] else "desconectado")
                    self.sync.pedir_heartbeat()
            elif subtema == "visit":
                self.sync.encolar("visit", mapping.visita_a_dto(feeder_id, datos, ahora))
            elif subtema == "event":
                self.sync.encolar("event", mapping.evento_a_dto(feeder_id, datos, ahora))
            elif subtema == "cmd/result":
                self.comandos.resultado_mqtt(feeder_id, datos)
        except mapping.PayloadInvalido as e:
            log.warning("Payload inválido en %s: %s | %r", tema, e, payload[:300])

    async def _al_conectar_mqtt(self) -> None:
        await self.sync.republicar_configs()
        await self._publicar_hora()

    async def _publicar_hora(self) -> None:
        if self.reloj.ahora() >= mapping.TIEMPO_MINIMO_VALIDO:
            await self.mqtt.publicar("gateway/time", mapping.codificar({"now": self.reloj.ahora()}), True)

    async def _bucle_hora(self) -> None:
        while True:
            await asyncio.sleep(self.cfg.mqtt.time_interval)
            await self._publicar_hora()

    async def _bucle_limpieza(self) -> None:
        while True:
            self.store.purgar_comandos(self.reloj.ahora() - 7 * 24 * 3600)
            await asyncio.sleep(3600)

    # ---------------- estado para /health ----------------

    def estado(self) -> dict[str, Any]:
        return {
            "version": __version__,
            "now": self.reloj.ahora(),
            "backendOnline": self.sync.en_linea,
            "mqttConnected": self.mqtt.conectado,
            "queue": self.store.tamano_cola(),
            "discarded": self.store.total_descartados(),
            "offlineSince": self.store.obtener("offline_since"),
            "lastError": self.sync.ultimo_error,
        }

    # ---------------- ciclo de vida ----------------

    async def run(self) -> None:
        log.info("Gateway %s (%s) iniciando; backend %s", __version__, self.cfg.backend.device_id,
                 self.cfg.backend.url)
        app = crear_app(self.ota, self.cfg.paths.photos_dir, self.sync.encolar, self.estado,
                        self.cfg.lan.max_photo_bytes)
        runner = web.AppRunner(app, access_log=None)
        await runner.setup()
        sitio = web.TCPSite(runner, self.cfg.lan.bind, self.cfg.lan.port)
        await sitio.start()
        log.info("Servidor LAN en %s:%d", self.cfg.lan.bind, self.cfg.lan.port)
        try:
            self.comandos.reanudar()
            await asyncio.gather(
                self.mqtt.run(),
                self.sync.run(),
                self._bucle_hora(),
                self._bucle_limpieza(),
            )
        finally:
            await runner.cleanup()
            await self.backend.aclose()
            self.store.close()
