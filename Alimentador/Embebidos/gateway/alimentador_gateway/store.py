"""Persistencia en SQLite: cola offline, estado, último status, configs y comandos.

Las operaciones son pequeñas y locales, así que se hacen de forma síncrona desde el
loop de asyncio (una sola conexión, modo WAL).
"""
from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ESQUEMA = """
CREATE TABLE IF NOT EXISTS cola (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo        TEXT    NOT NULL,          -- visit | event | result | photo
    payload     TEXT    NOT NULL,
    creado_en   INTEGER NOT NULL,
    intentos    INTEGER NOT NULL DEFAULT 0,
    ultimo_error TEXT
);
CREATE TABLE IF NOT EXISTS descartados (
    id          INTEGER PRIMARY KEY,
    tipo        TEXT    NOT NULL,
    payload     TEXT    NOT NULL,
    creado_en   INTEGER NOT NULL,
    descartado_en INTEGER NOT NULL,
    motivo      TEXT
);
CREATE TABLE IF NOT EXISTS estado (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS status_feeder (
    feeder_id TEXT PRIMARY KEY,
    payload   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS config_feeder (
    feeder_id TEXT PRIMARY KEY,
    version   INTEGER NOT NULL,
    payload   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comandos (
    id          INTEGER PRIMARY KEY,       -- id del backend
    feeder_id   TEXT    NOT NULL,
    tipo        TEXT    NOT NULL,          -- dispense | ota
    payload     TEXT    NOT NULL,          -- ComandoDispositivoDto recibido
    estado      TEXT    NOT NULL,          -- recibido | enviado | terminado
    recibido_en INTEGER NOT NULL,
    enviado_en  INTEGER
);
"""

TIPOS_COLA = ("visit", "event", "result", "photo")


@dataclass(frozen=True)
class ItemCola:
    id: int
    tipo: str
    payload: dict[str, Any]
    creado_en: int
    intentos: int


@dataclass(frozen=True)
class ComandoGuardado:
    id: int
    feeder_id: str
    tipo: str
    payload: dict[str, Any]
    estado: str
    recibido_en: int
    enviado_en: int | None


class Store:
    def __init__(self, ruta: str | Path):
        if str(ruta) != ":memory:":
            Path(ruta).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(str(ruta), isolation_level=None, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("PRAGMA synchronous=NORMAL")
        self._db.executescript(ESQUEMA)

    def close(self) -> None:
        self._db.close()

    # ---------------- cola ----------------

    def encolar(self, tipo: str, payload: dict[str, Any], ahora: int | None = None) -> int:
        if tipo not in TIPOS_COLA:
            raise ValueError(f"tipo de cola desconocido: {tipo}")
        cur = self._db.execute(
            "INSERT INTO cola (tipo, payload, creado_en) VALUES (?, ?, ?)",
            (tipo, json.dumps(payload, separators=(",", ":")), ahora or int(time.time())),
        )
        return int(cur.lastrowid)

    def primeros(self, limite: int) -> list[ItemCola]:
        filas = self._db.execute(
            "SELECT id, tipo, payload, creado_en, intentos FROM cola ORDER BY id LIMIT ?", (limite,)
        ).fetchall()
        return [ItemCola(f["id"], f["tipo"], json.loads(f["payload"]), f["creado_en"], f["intentos"]) for f in filas]

    def lote_inicial(self, maximo: int) -> list[ItemCola]:
        """Primer elemento de la cola y los siguientes consecutivos del mismo tipo.

        Así se mandan lotes sin alterar el orden global entre visitas, eventos y resultados.
        Las fotos y los resultados van de uno en uno.
        """
        items = self.primeros(maximo)
        if not items:
            return []
        tipo = items[0].tipo
        if tipo not in ("visit", "event"):
            return items[:1]
        lote = []
        for item in items:
            if item.tipo != tipo:
                break
            lote.append(item)
        return lote

    def quitar(self, ids: list[int]) -> None:
        self._db.executemany("DELETE FROM cola WHERE id = ?", [(i,) for i in ids])

    def marcar_fallo(self, ids: list[int], error: str) -> None:
        self._db.executemany(
            "UPDATE cola SET intentos = intentos + 1, ultimo_error = ? WHERE id = ?",
            [(error[:500], i) for i in ids],
        )

    def descartar(self, ids: list[int], motivo: str) -> None:
        """Mueve a 'descartados' lo que el backend rechazó de forma definitiva."""
        ahora = int(time.time())
        with self._db:
            self._db.execute("BEGIN")
            for i in ids:
                self._db.execute(
                    "INSERT OR REPLACE INTO descartados (id, tipo, payload, creado_en, descartado_en, motivo) "
                    "SELECT id, tipo, payload, creado_en, ?, ? FROM cola WHERE id = ?",
                    (ahora, motivo[:500], i),
                )
                self._db.execute("DELETE FROM cola WHERE id = ?", (i,))

    def tamano_cola(self) -> int:
        return int(self._db.execute("SELECT COUNT(*) FROM cola").fetchone()[0])

    def total_descartados(self) -> int:
        return int(self._db.execute("SELECT COUNT(*) FROM descartados").fetchone()[0])

    # ---------------- estado clave/valor ----------------

    def obtener(self, clave: str, defecto: Any = None) -> Any:
        fila = self._db.execute("SELECT valor FROM estado WHERE clave = ?", (clave,)).fetchone()
        return json.loads(fila[0]) if fila else defecto

    def guardar(self, clave: str, valor: Any) -> None:
        self._db.execute(
            "INSERT INTO estado (clave, valor) VALUES (?, ?) "
            "ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
            (clave, json.dumps(valor)),
        )

    def borrar(self, clave: str) -> None:
        self._db.execute("DELETE FROM estado WHERE clave = ?", (clave,))

    # ---------------- último status de cada ESP32 ----------------

    def guardar_status(self, feeder_id: str, estado: dict[str, Any]) -> None:
        self._db.execute(
            "INSERT INTO status_feeder (feeder_id, payload) VALUES (?, ?) "
            "ON CONFLICT(feeder_id) DO UPDATE SET payload = excluded.payload",
            (feeder_id, json.dumps(estado)),
        )

    def status(self, feeder_id: str) -> dict[str, Any] | None:
        fila = self._db.execute("SELECT payload FROM status_feeder WHERE feeder_id = ?", (feeder_id,)).fetchone()
        return json.loads(fila[0]) if fila else None

    def todos_los_status(self) -> list[dict[str, Any]]:
        filas = self._db.execute("SELECT payload FROM status_feeder ORDER BY feeder_id").fetchall()
        return [json.loads(f[0]) for f in filas]

    # ---------------- config publicada a cada ESP32 ----------------

    def guardar_config(self, feeder_id: str, version: int, payload: dict[str, Any]) -> None:
        self._db.execute(
            "INSERT INTO config_feeder (feeder_id, version, payload) VALUES (?, ?, ?) "
            "ON CONFLICT(feeder_id) DO UPDATE SET version = excluded.version, payload = excluded.payload",
            (feeder_id, version, json.dumps(payload)),
        )

    def configs(self) -> dict[str, dict[str, Any]]:
        filas = self._db.execute("SELECT feeder_id, payload FROM config_feeder").fetchall()
        return {f["feeder_id"]: json.loads(f["payload"]) for f in filas}

    def borrar_config(self, feeder_id: str) -> None:
        self._db.execute("DELETE FROM config_feeder WHERE feeder_id = ?", (feeder_id,))

    # ---------------- comandos ----------------

    def agregar_comando(self, comando: dict[str, Any], ahora: int | None = None) -> bool:
        """Guarda un comando recién recibido. Devuelve False si ya se conocía."""
        cur = self._db.execute(
            "INSERT OR IGNORE INTO comandos (id, feeder_id, tipo, payload, estado, recibido_en) "
            "VALUES (?, ?, ?, ?, 'recibido', ?)",
            (int(comando["id"]), comando["feederId"], comando["type"], json.dumps(comando), ahora or int(time.time())),
        )
        return cur.rowcount == 1

    def marcar_comando(self, comando_id: int, estado: str, enviado_en: int | None = None) -> None:
        if enviado_en is not None:
            self._db.execute("UPDATE comandos SET estado = ?, enviado_en = ? WHERE id = ?",
                             (estado, enviado_en, comando_id))
        else:
            self._db.execute("UPDATE comandos SET estado = ? WHERE id = ?", (estado, comando_id))

    def comando(self, comando_id: int) -> ComandoGuardado | None:
        fila = self._db.execute("SELECT * FROM comandos WHERE id = ?", (comando_id,)).fetchone()
        return self._a_comando(fila) if fila else None

    def comandos_pendientes(self) -> list[ComandoGuardado]:
        filas = self._db.execute("SELECT * FROM comandos WHERE estado != 'terminado' ORDER BY id").fetchall()
        return [self._a_comando(f) for f in filas]

    def purgar_comandos(self, antes_de: int) -> None:
        self._db.execute("DELETE FROM comandos WHERE estado = 'terminado' AND recibido_en < ?", (antes_de,))

    @staticmethod
    def _a_comando(f: sqlite3.Row) -> ComandoGuardado:
        return ComandoGuardado(f["id"], f["feeder_id"], f["tipo"], json.loads(f["payload"]),
                               f["estado"], f["recibido_en"], f["enviado_en"])
