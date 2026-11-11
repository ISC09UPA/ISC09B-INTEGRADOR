"""python -m alimentador_gateway --config /etc/alimentador/config.toml"""
from __future__ import annotations

import argparse
import asyncio
import contextlib
import logging
import signal
import sys

from . import __version__
from .config import ConfigError, load


async def _principal(cfg) -> None:
    from .app import Gateway

    gateway = Gateway(cfg)
    tarea = asyncio.create_task(gateway.run())
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, tarea.cancel)
    with contextlib.suppress(asyncio.CancelledError):
        await tarea
    logging.getLogger(__name__).info("Gateway detenido")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="alimentador-gateway", description="Gateway del Alimentador Inteligente")
    parser.add_argument("-c", "--config", default="/etc/alimentador/config.toml")
    parser.add_argument("--check", action="store_true", help="solo valida la configuración")
    parser.add_argument("--version", action="version", version=__version__)
    args = parser.parse_args(argv)

    try:
        cfg = load(args.config)
    except ConfigError as e:
        print(f"Error de configuración: {e}", file=sys.stderr)
        return 2
    if args.check:
        print(f"{args.config}: OK (gateway {cfg.backend.device_id} -> {cfg.backend.url})")
        return 0

    logging.basicConfig(
        level=getattr(logging, cfg.log.level.upper(), logging.INFO),
        format="%(levelname)s %(name)s: %(message)s",  # journald ya agrega la hora
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    asyncio.run(_principal(cfg))
    return 0


if __name__ == "__main__":
    sys.exit(main())
