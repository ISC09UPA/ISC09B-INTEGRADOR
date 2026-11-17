#!/usr/bin/env python3
"""
Simulador de la Raspberry del Almacén Inteligente
=================================================
Manda lecturas a la Function de ingesta (POST /api/lecturas) con el mismo formato
que debe usar la Raspberry real. Sirve para probar la nube sin la maqueta y como
referencia para el código del embebido.

Sin conexión, las lecturas se guardan en pendientes.jsonl (junto a este archivo) y
se reenvían en el siguiente envío o con el comando "sincronizar". Cada lectura lleva
un lecturaId único, así que reenviarla nunca la duplica en la base.

Solo usa la biblioteca estándar de Python 3 (no hay que instalar nada).

Configuración (variables de entorno o parámetros --url y --clave):
  ALMACEN_INGESTA_URL    local: http://localhost:7071
                         Azure: https://<function-app>.azurewebsites.net
  ALMACEN_INGESTA_CLAVE  clave "default" de la Function App (en local no se necesita)

Ejemplos (PowerShell, desde Almacen/Backend/Simulador):
  python simulador_raspberry.py salud
  python simulador_raspberry.py entrada A1-E1 5
  python simulador_raspberry.py salida A1-E1 2
  python simulador_raspberry.py peso A1-E1 523
  python simulador_raspberry.py demo A1-E1
  python simulador_raspberry.py demo A1-E1 --sin-conexion   (simula que se cayó el internet)
  python simulador_raspberry.py pendientes
  python simulador_raspberry.py sincronizar
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

DISPOSITIVO_POR_OMISION = "rpi-simulador-01"
ARCHIVO_PENDIENTES = Path(__file__).with_name("pendientes.jsonl")
MAXIMO_POR_ENVIO = 100   # el mismo límite que la Function de ingesta
TIMEOUT_SEGUNDOS = 15


class SinConexion(Exception):
    """No se pudo llegar a la Function (sin internet, URL mal escrita o Function apagada)."""


# ── Lecturas ─────────────────────────────────────────────────

def hora_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def nueva_lectura(dispositivo: str, espacio: str, tipo_sensor: str, **datos) -> dict:
    lectura = {
        "lecturaId": uuid.uuid4().hex,
        "dispositivoId": dispositivo,
        "espacioId": espacio.upper(),
        "tipoSensor": tipo_sensor,
        "fechaHora": hora_utc(),
    }
    lectura.update({k: v for k, v in datos.items() if v is not None})
    return lectura


def lectura_ir(dispositivo: str, espacio: str, evento: str, cantidad: int) -> dict:
    return nueva_lectura(dispositivo, espacio, "IR", evento=evento, cantidad=cantidad)


def lectura_peso(dispositivo: str, espacio: str, gramos: float) -> dict:
    return nueva_lectura(dispositivo, espacio, "PESO", pesoGramos=gramos)


# ── Guardado local (modo sin conexión) ───────────────────────

def leer_pendientes() -> list:
    if not ARCHIVO_PENDIENTES.exists():
        return []
    lecturas = []
    for linea in ARCHIVO_PENDIENTES.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if linea:
            lecturas.append(json.loads(linea))
    return lecturas


def guardar_pendientes(lecturas: list) -> None:
    if not lecturas:
        if ARCHIVO_PENDIENTES.exists():
            ARCHIVO_PENDIENTES.write_text("", encoding="utf-8")
        return
    texto = "\n".join(json.dumps(l, ensure_ascii=False) for l in lecturas) + "\n"
    ARCHIVO_PENDIENTES.write_text(texto, encoding="utf-8")


# ── HTTP ─────────────────────────────────────────────────────

def peticion(cfg, metodo: str, ruta: str, cuerpo=None):
    """Devuelve (código HTTP, cuerpo). Lanza SinConexion si no hay respuesta."""
    url = cfg.url.rstrip("/") + ruta
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    req = urllib.request.Request(url, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if cfg.clave:
        req.add_header("x-functions-key", cfg.clave)

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEGUNDOS) as r:
            return r.status, leer_json(r.read())
    except urllib.error.HTTPError as e:
        return e.code, leer_json(e.read())
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise SinConexion(str(getattr(e, "reason", e))) from e


def leer_json(datos: bytes):
    texto = datos.decode("utf-8", errors="replace")
    if not texto:
        return None
    try:
        return json.loads(texto)
    except ValueError:
        return texto


# ── Envío ────────────────────────────────────────────────────

def enviar(cfg, nuevas: list) -> None:
    """Manda primero lo pendiente y luego lo nuevo. Lo que no se pudo mandar queda guardado."""
    cola = leer_pendientes() + nuevas

    if cfg.sin_conexion:
        guardar_pendientes(cola)
        print(f"[SIN CONEXIÓN] {len(nuevas)} lectura(s) guardada(s). Pendientes: {len(cola)}.")
        return

    if not cola:
        print("No hay lecturas por mandar.")
        return

    enviadas = 0
    while cola:
        lote = cola[:MAXIMO_POR_ENVIO]
        try:
            codigo, cuerpo = peticion(cfg, "POST", "/api/lecturas", lote)
        except SinConexion as e:
            guardar_pendientes(cola)
            print(f"[SIN CONEXIÓN] {e}. Quedaron {len(cola)} lectura(s) guardada(s) para después.")
            return

        if codigo == 202:
            rechazadas = cuerpo.get("rechazadas", []) if isinstance(cuerpo, dict) else []
            aceptadas = cuerpo.get("aceptadas", len(lote)) if isinstance(cuerpo, dict) else len(lote)
            print(f"[OK 202] {aceptadas} lectura(s) en la cola de Service Bus.")
            for r in rechazadas:
                print(f"   rechazada #{r.get('indice')}: {r.get('error')}")
        elif codigo == 400:
            # Inválidas: reenviarlas no sirve de nada, se descartan.
            print(f"[400] Lote rechazado y descartado: {cuerpo}")
        elif codigo in (401, 403):
            guardar_pendientes(cola)
            print(f"[{codigo}] La Function rechazó la clave. Revisa ALMACEN_INGESTA_CLAVE. "
                  f"Quedaron {len(cola)} lectura(s) guardada(s).")
            return
        else:
            guardar_pendientes(cola)
            print(f"[{codigo}] Error de la Function: {cuerpo}. Quedaron {len(cola)} lectura(s) guardada(s).")
            return

        enviadas += len(lote)
        cola = cola[MAXIMO_POR_ENVIO:]
        guardar_pendientes(cola)

    print(f"Listo: {enviadas} lectura(s) enviadas, 0 pendientes.")


# ── Comandos ─────────────────────────────────────────────────

def cmd_salud(cfg, _args):
    try:
        codigo, cuerpo = peticion(cfg, "GET", "/api/salud")
        print(f"[{codigo}] {cuerpo}")
    except SinConexion as e:
        print(f"[SIN CONEXIÓN] {e}")


def cmd_entrada(cfg, args):
    enviar(cfg, [lectura_ir(cfg.dispositivo, args.espacio, "ENTRADA", args.cantidad)])


def cmd_salida(cfg, args):
    enviar(cfg, [lectura_ir(cfg.dispositivo, args.espacio, "SALIDA", args.cantidad)])


def cmd_peso(cfg, args):
    enviar(cfg, [lectura_peso(cfg.dispositivo, args.espacio, args.gramos)])


def cmd_demo(cfg, args):
    """Entran piezas y luego salen de una en una, como si un operador fuera tomando del contenedor."""
    print(f"Demo en {args.espacio.upper()}: entran {args.entran} y salen {args.salen} (una cada {args.pausa} s).")
    enviar(cfg, [lectura_ir(cfg.dispositivo, args.espacio, "ENTRADA", args.entran)])
    for i in range(1, args.salen + 1):
        time.sleep(args.pausa)
        print(f"Salida {i}/{args.salen}")
        enviar(cfg, [lectura_ir(cfg.dispositivo, args.espacio, "SALIDA", 1)])
    print("Revisa la existencia con GET /api/productos y los movimientos con GET /api/movimientos (origen SENSOR).")


def cmd_pendientes(_cfg, _args):
    pendientes = leer_pendientes()
    print(f"{len(pendientes)} lectura(s) guardada(s) en {ARCHIVO_PENDIENTES.name}.")
    for l in pendientes[:20]:
        detalle = l.get("evento") or f"{l.get('pesoGramos')} g"
        print(f"  {l['fechaHora']}  {l['espacioId']}  {l['tipoSensor']}  {detalle}  {l.get('cantidad', '')}")
    if len(pendientes) > 20:
        print(f"  ... y {len(pendientes) - 20} más")


def cmd_sincronizar(cfg, _args):
    enviar(cfg, [])


def crear_parser():
    p = argparse.ArgumentParser(description="Simulador de la Raspberry del Almacén Inteligente.")
    p.add_argument("--url", default=os.environ.get("ALMACEN_INGESTA_URL", "http://localhost:7071"),
                   help="URL de la Function App (por omisión ALMACEN_INGESTA_URL o http://localhost:7071)")
    p.add_argument("--clave", default=os.environ.get("ALMACEN_INGESTA_CLAVE", ""),
                   help="Clave de la Function App (por omisión ALMACEN_INGESTA_CLAVE)")
    p.add_argument("--dispositivo", default=DISPOSITIVO_POR_OMISION, help="dispositivoId que se manda")
    p.add_argument("--sin-conexion", action="store_true",
                   help="No manda nada: guarda las lecturas como si no hubiera internet")

    sub = p.add_subparsers(dest="comando", required=True)

    sub.add_parser("salud", help="Revisa si la Function responde").set_defaults(func=cmd_salud)

    for nombre, func in (("entrada", cmd_entrada), ("salida", cmd_salida)):
        s = sub.add_parser(nombre, help=f"Sensor IR: {nombre} de piezas")
        s.add_argument("espacio", help="Espacio, por ejemplo A1-E1")
        s.add_argument("cantidad", type=int, nargs="?", default=1, help="Piezas (por omisión 1)")
        s.set_defaults(func=func)

    s = sub.add_parser("peso", help="Celda de carga: peso total del espacio en gramos")
    s.add_argument("espacio")
    s.add_argument("gramos", type=float)
    s.set_defaults(func=cmd_peso)

    s = sub.add_parser("demo", help="Secuencia de entradas y salidas para la presentación")
    s.add_argument("espacio")
    s.add_argument("--entran", type=int, default=10)
    s.add_argument("--salen", type=int, default=8)
    s.add_argument("--pausa", type=float, default=2.0)
    s.set_defaults(func=cmd_demo)

    sub.add_parser("pendientes", help="Muestra lo guardado sin conexión").set_defaults(func=cmd_pendientes)
    sub.add_parser("sincronizar", help="Reenvía lo guardado sin conexión").set_defaults(func=cmd_sincronizar)
    return p


def main():
    args = crear_parser().parse_args()
    args.func(args, args)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
