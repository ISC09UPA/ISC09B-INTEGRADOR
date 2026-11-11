"""Ejecución de comandos del backend (dispense y ota) contra los ESP32.

Cada comando se guarda en SQLite en cuanto llega (el backend ya lo marcó como entregado),
se publica en feeder/{id}/cmd y se espera feeder/{id}/cmd/result. El resultado entra a la
cola offline para POST commands/{id}/result. Si la Pi se reinicia, los comandos sin
terminar se reanudan con el tiempo que les quedaba.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable

from . import mapping
from .backend import BackendError, Sha256NoCoincide
from .config import CommandsConfig
from .ota import GestorOta
from .store import ComandoGuardado, Store
from .util import Reloj

log = logging.getLogger(__name__)

Publicar = Callable[[str, bytes, bool], Awaitable[bool]]
Encolar = Callable[[str, dict[str, Any]], Any]

REINTENTOS_DESCARGA = 3


class GestorComandos:
    def __init__(self, cfg: CommandsConfig, store: Store, publicar: Publicar, encolar: Encolar,
                 ota: GestorOta, reloj: Reloj | None = None):
        self.cfg = cfg
        self.store = store
        self.publicar = publicar
        self.encolar = encolar
        self.ota = ota
        self.reloj = reloj or Reloj()
        self._esperas: dict[int, asyncio.Future] = {}
        self._tareas: set[asyncio.Task] = set()
        self.espera_publicacion = 2.0

    # ---------------- entrada ----------------

    def recibir(self, cmd: dict[str, Any]) -> bool:
        """ComandoDispositivoDto recién llegado de GET /api/device/commands."""
        try:
            int(cmd["id"])
            if not mapping.FEEDER_ID_RE.match(str(cmd["feederId"])):
                raise ValueError("feederId inválido")
            if cmd.get("type") not in ("dispense", "ota"):
                raise ValueError(f"tipo desconocido {cmd.get('type')!r}")
        except (KeyError, TypeError, ValueError) as e:
            log.error("Comando inválido del backend %r: %s", cmd, e)
            if isinstance(cmd, dict) and isinstance(cmd.get("id"), int):
                self.encolar("result", {"commandId": cmd["id"],
                                        "result": mapping.resultado_local(False, f"invalid_command: {e}")})
            return False
        if not self.store.agregar_comando(cmd, self.reloj.ahora()):
            return False
        log.info("Comando %s (%s) para %s", cmd["id"], cmd["type"], cmd["feederId"])
        guardado = self.store.comando(int(cmd["id"]))
        self._lanzar(guardado)
        return True

    def reanudar(self) -> int:
        """Reanuda los comandos que quedaron a medias antes de un reinicio."""
        pendientes = self.store.comandos_pendientes()
        for c in pendientes:
            log.info("Reanudando comando %d (%s, %s)", c.id, c.tipo, c.estado)
            self._lanzar(c)
        return len(pendientes)

    def resultado_mqtt(self, feeder_id: str, datos: dict[str, Any]) -> None:
        """feeder/{id}/cmd/result."""
        comando_id, resultado = mapping.resultado_a_dto(datos)
        espera = self._esperas.get(comando_id)
        if espera is not None and not espera.done():
            espera.set_result(resultado)
            return
        guardado = self.store.comando(comando_id)
        if guardado is not None and guardado.estado == "terminado":
            log.debug("Resultado repetido del comando %d; se ignora", comando_id)
            return
        if guardado is not None and guardado.feeder_id != feeder_id:
            log.warning("cmd/result %d llegó de %s pero el comando es de %s; se ignora",
                        comando_id, feeder_id, guardado.feeder_id)
            return
        # Resultado tardío (p. ej. el ESP32 lo guardó en LittleFS) o de un comando desconocido:
        # se reenvía igual; el backend ignora repetidos y comandos ajenos.
        self._terminar(comando_id, resultado)

    # ---------------- ejecución ----------------

    def _lanzar(self, c: ComandoGuardado) -> None:
        # La espera se registra antes de publicar para no perder un resultado muy rápido
        self._esperas[c.id] = asyncio.get_running_loop().create_future()
        tarea = asyncio.create_task(self._ejecutar(c), name=f"comando-{c.id}")
        self._tareas.add(tarea)
        tarea.add_done_callback(self._tareas.discard)

    async def esperar_todos(self) -> None:
        if self._tareas:
            await asyncio.gather(*list(self._tareas), return_exceptions=True)

    async def _ejecutar(self, c: ComandoGuardado) -> None:
        try:
            if c.tipo == "dispense":
                await self._dispensar(c)
            elif c.tipo == "ota":
                await self._ota(c)
            else:
                self._terminar(c.id, mapping.resultado_local(False, f"unsupported: {c.tipo}"))
        except asyncio.CancelledError:
            raise  # al apagar: el comando queda pendiente y se reanuda al arrancar
        except Exception as e:  # noqa: BLE001
            log.exception("Error ejecutando el comando %d", c.id)
            self._terminar(c.id, mapping.resultado_local(False, f"gateway_error: {e}"))
        finally:
            self._esperas.pop(c.id, None)

    def _terminar(self, comando_id: int, resultado: dict[str, Any]) -> None:
        espera = self._esperas.get(comando_id)
        if espera is not None and not espera.done():
            espera.cancel()
        self.encolar("result", {"commandId": comando_id, "result": resultado})
        self.store.marcar_comando(comando_id, "terminado")
        log.info("Comando %d terminado: ok=%s error=%s", comando_id, resultado.get("ok"), resultado.get("error"))

    async def _publicar_hasta(self, c: ComandoGuardado, payload: dict[str, Any], limite: float) -> bool:
        """Publica en feeder/{id}/cmd reintentando mientras MQTT no esté disponible."""
        tema = f"feeder/{c.feeder_id}/cmd"
        datos = mapping.codificar(payload)
        while True:
            if await self.publicar(tema, datos, False):
                self.store.marcar_comando(c.id, "enviado", self.reloj.ahora())
                return True
            if self.reloj.ahora() >= limite:
                return False
            await asyncio.sleep(self.espera_publicacion)

    async def _esperar_resultado(self, c: ComandoGuardado, segundos: float) -> dict[str, Any] | None:
        espera = self._esperas[c.id]
        try:
            return await asyncio.wait_for(asyncio.shield(espera), max(0.0, segundos))
        except asyncio.TimeoutError:
            return None

    def _esp32_desconectado(self, feeder_id: str) -> bool:
        estado = self.store.status(feeder_id)
        return estado is not None and estado.get("online") is False

    async def _dispensar(self, c: ComandoGuardado) -> None:
        ahora = self.reloj.ahora()
        if c.estado == "recibido":
            limite = c.recibido_en + self.cfg.dispense_max_age
            if ahora > limite:
                self._terminar(c.id, mapping.resultado_local(False, "expired"))
                return
            if self._esp32_desconectado(c.feeder_id):
                self._terminar(c.id, mapping.resultado_local(False, "feeder_offline"))
                return
            if not await self._publicar_hasta(c, mapping.comando_dispensar_a_mqtt(c.payload), limite):
                self._terminar(c.id, mapping.resultado_local(False, "mqtt_unavailable"))
                return
            enviado = self.reloj.ahora()
        else:
            enviado = c.enviado_en or c.recibido_en
        restante = enviado + self.cfg.dispense_timeout - self.reloj.ahora()
        resultado = await self._esperar_resultado(c, restante)
        self._terminar(c.id, resultado or mapping.resultado_local(False, "timeout"))

    async def _ota(self, c: ComandoGuardado) -> None:
        if c.estado == "recibido":
            payload = None
            for intento in range(1, REINTENTOS_DESCARGA + 1):
                try:
                    payload = await self.ota.preparar(c.payload)
                    break
                except Sha256NoCoincide as e:
                    log.error("OTA %d: %s", c.id, e)
                    self._terminar(c.id, mapping.resultado_local(False, "sha256_mismatch"))
                    return
                except ValueError as e:
                    self._terminar(c.id, mapping.resultado_local(False, f"invalid_command: {e}"))
                    return
                except BackendError as e:
                    log.warning("OTA %d: descarga falló (intento %d): %s", c.id, intento, e)
                    if intento < REINTENTOS_DESCARGA:
                        await asyncio.sleep(5 * intento)
            if payload is None:
                self._terminar(c.id, mapping.resultado_local(False, "download_failed"))
                return
            limite = self.reloj.ahora() + self.cfg.ota_timeout
            if not await self._publicar_hasta(c, payload, limite):
                self._terminar(c.id, mapping.resultado_local(False, "mqtt_unavailable"))
                return
            log.info("OTA %d publicada a %s: %s %s", c.id, c.feeder_id, payload["target"], payload["version"])
            enviado = self.reloj.ahora()
        else:
            enviado = c.enviado_en or c.recibido_en
        restante = enviado + self.cfg.ota_timeout - self.reloj.ahora()
        resultado = await self._esperar_resultado(c, restante)
        self._terminar(c.id, resultado or mapping.resultado_local(False, "timeout"))
