"""Conexión al broker Mosquitto local (aiomqtt) con reconexión automática."""
from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable

import aiomqtt

from .config import MqttConfig
from .util import backoff

log = logging.getLogger(__name__)

SUSCRIPCIONES = (
    "feeder/+/status",
    "feeder/+/visit",
    "feeder/+/event",
    "feeder/+/cmd/result",
)

Manejador = Callable[[str, bytes, bool], None]
AlConectar = Callable[[], Awaitable[None]]


class PuenteMqtt:
    def __init__(self, cfg: MqttConfig, manejador: Manejador, al_conectar: AlConectar | None = None):
        self.cfg = cfg
        self.manejador = manejador
        self.al_conectar = al_conectar
        self._cliente: aiomqtt.Client | None = None
        self.conectado = False

    async def publicar(self, tema: str, payload: bytes, retain: bool = False, qos: int = 1) -> bool:
        """Publica si hay conexión. Devuelve False si el broker no está disponible."""
        cliente = self._cliente
        if cliente is None or not self.conectado:
            return False
        try:
            await cliente.publish(tema, payload, qos=qos, retain=retain, timeout=10)
            return True
        except aiomqtt.MqttError as e:
            log.warning("No se pudo publicar en %s: %s", tema, e)
            return False

    async def run(self) -> None:
        intentos = 0
        while True:
            try:
                async with aiomqtt.Client(
                    self.cfg.host, self.cfg.port,
                    username=self.cfg.username or None,
                    password=self.cfg.password or None,
                    identifier=self.cfg.client_id,
                    keepalive=self.cfg.keepalive,
                    # Sesión persistente: el broker guarda los QoS 1 mientras la Pi reinicia
                    clean_session=False,
                ) as cliente:
                    self._cliente = cliente
                    self.conectado = True
                    intentos = 0
                    for tema in SUSCRIPCIONES:
                        await cliente.subscribe(tema, qos=1)
                    log.info("Conectado a MQTT %s:%d", self.cfg.host, self.cfg.port)
                    if self.al_conectar is not None:
                        asyncio.create_task(self.al_conectar())
                    async for mensaje in cliente.messages:
                        try:
                            self.manejador(str(mensaje.topic), bytes(mensaje.payload or b""), bool(mensaje.retain))
                        except Exception:  # noqa: BLE001 - un mensaje malo no tumba la conexión
                            log.exception("Error procesando %s", mensaje.topic)
            except aiomqtt.MqttError as e:
                intentos += 1
                espera = backoff(intentos, 1.0, 30.0)
                log.warning("MQTT desconectado (%s); reintento en %.0f s", e, espera)
                self.conectado = False
                self._cliente = None
                await asyncio.sleep(espera)
            finally:
                self.conectado = False
                self._cliente = None
