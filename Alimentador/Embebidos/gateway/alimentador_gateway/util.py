"""Utilidades: reloj corregido, espera con backoff e IP de la LAN."""
from __future__ import annotations

import asyncio
import logging
import random
import socket
import time

log = logging.getLogger(__name__)


class Reloj:
    """Hora Unix en segundos.

    La Raspberry Pi no tiene RTC: si arranca sin internet su hora puede estar atrasada.
    Con el serverTime del heartbeat se corrige el desfase para gateway/time y validaciones.
    """

    UMBRAL_DESFASE = 5

    def __init__(self, base=time.time):
        self._base = base
        self.desfase = 0
        self.confiable = False

    def ahora(self) -> int:
        return int(self._base() + self.desfase)

    def ajustar(self, server_time: int) -> None:
        diferencia = int(server_time - self._base())
        nuevo = diferencia if abs(diferencia) > self.UMBRAL_DESFASE else 0
        if nuevo != self.desfase:
            log.warning("Reloj de la Pi desfasado %+d s respecto al backend; se corrige", nuevo)
        self.desfase = nuevo
        self.confiable = True


def backoff(intentos: int, base: float, maximo: float) -> float:
    """Espera exponencial con jitter: base * 2^(n-1), tope maximo."""
    if intentos <= 0:
        return 0.0
    espera = min(maximo, base * (2 ** min(intentos - 1, 20)))
    return espera * random.uniform(0.8, 1.0)


async def esperar_evento(evento: asyncio.Event, timeout: float) -> bool:
    """Espera a que se active el evento o pase el timeout. Lo limpia al salir."""
    try:
        await asyncio.wait_for(evento.wait(), timeout)
        return True
    except asyncio.TimeoutError:
        return False
    finally:
        evento.clear()


def ip_lan(referencia: str = "8.8.8.8") -> str:
    """IP de la interfaz con ruta por defecto (no envía paquetes)."""
    for destino in (referencia, "192.168.1.1", "10.0.0.1"):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect((destino, 80))
                ip = s.getsockname()[0]
                if not ip.startswith("127."):
                    return ip
        except OSError:
            continue
    return f"{socket.gethostname()}.local"
