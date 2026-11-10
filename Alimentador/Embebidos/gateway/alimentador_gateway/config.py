"""Carga de config.toml."""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any


class ConfigError(Exception):
    pass


@dataclass
class BackendConfig:
    url: str = ""
    device_id: str = ""
    device_key: str = ""
    timeout: float = 15.0
    health_interval: float = 15
    heartbeat_interval: float = 60
    config_interval: float = 30
    config_full_refresh: float = 3600
    commands_interval: float = 5
    batch_size: int = 50
    backoff_base: float = 2.0
    backoff_max: float = 300.0


@dataclass
class MqttConfig:
    host: str = "127.0.0.1"
    port: int = 1883
    username: str | None = None
    password: str | None = None
    client_id: str = "alimentador-gateway"
    keepalive: int = 30
    time_interval: float = 60


@dataclass
class LanConfig:
    bind: str = "0.0.0.0"
    port: int = 8080
    public_host: str = ""
    max_photo_bytes: int = 2 * 1024 * 1024


@dataclass
class PathsConfig:
    data_dir: Path = Path("/var/lib/alimentador")
    ota_dir: Path = Path("/var/lib/alimentador/ota")
    photos_dir: Path = Path("/var/lib/alimentador/fotos")

    @property
    def db_path(self) -> Path:
        return self.data_dir / "gateway.db"


@dataclass
class CommandsConfig:
    dispense_timeout: float = 90
    dispense_max_age: float = 120
    ota_timeout: float = 900


@dataclass
class LogConfig:
    level: str = "INFO"


@dataclass
class Config:
    backend: BackendConfig = field(default_factory=BackendConfig)
    mqtt: MqttConfig = field(default_factory=MqttConfig)
    lan: LanConfig = field(default_factory=LanConfig)
    paths: PathsConfig = field(default_factory=PathsConfig)
    commands: CommandsConfig = field(default_factory=CommandsConfig)
    log: LogConfig = field(default_factory=LogConfig)


def _seccion(cls: type, datos: dict[str, Any], nombre: str):
    validos = {f.name: f for f in fields(cls)}
    desconocidos = set(datos) - set(validos)
    if desconocidos:
        raise ConfigError(f"[{nombre}] claves desconocidas: {', '.join(sorted(desconocidos))}")
    valores = {}
    for clave, valor in datos.items():
        if cls is PathsConfig:
            valor = Path(valor)
        valores[clave] = valor
    return cls(**valores)


def from_dict(datos: dict[str, Any]) -> Config:
    secciones = {
        "backend": BackendConfig, "mqtt": MqttConfig, "lan": LanConfig,
        "paths": PathsConfig, "commands": CommandsConfig, "log": LogConfig,
    }
    desconocidas = set(datos) - set(secciones)
    if desconocidas:
        raise ConfigError(f"Secciones desconocidas: {', '.join(sorted(desconocidas))}")
    cfg = Config(**{n: _seccion(c, datos.get(n, {}), n) for n, c in secciones.items()})
    validar(cfg)
    return cfg


def validar(cfg: Config) -> None:
    b = cfg.backend
    if not b.url.startswith(("http://", "https://")):
        raise ConfigError("[backend] url debe empezar con http:// o https://")
    b.url = b.url.rstrip("/")
    if not b.device_id or not b.device_key or "PEGA-AQUI" in b.device_key:
        raise ConfigError("[backend] faltan device_id / device_key (POST /api/gateways)")
    if b.batch_size < 1:
        raise ConfigError("[backend] batch_size debe ser >= 1")


def load(path: str | Path) -> Config:
    ruta = Path(path)
    try:
        with ruta.open("rb") as f:
            datos = tomllib.load(f)
    except FileNotFoundError as e:
        raise ConfigError(f"No existe {ruta}; copia config.example.toml") from e
    except tomllib.TOMLDecodeError as e:
        raise ConfigError(f"{ruta}: TOML inválido: {e}") from e
    return from_dict(datos)
