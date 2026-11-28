import json
import os
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

API = os.environ.get("API_URL", "")
KEY = os.environ.get("DEVICE_KEY", "")
REFRESCO_USUARIOS_S = 60
REFRESCO_TURNOS_S = 5
ESTADOS = ("EnEspera", "Llamado", "EnConsulta", "Finalizado")

db = sqlite3.connect(os.path.expanduser("~/consultorio.db"), check_same_thread=False, timeout=10)
db.executescript(
    """
    CREATE TABLE IF NOT EXISTS cola (id INTEGER PRIMARY KEY AUTOINCREMENT, ruta TEXT, cuerpo TEXT);
    CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, nombre TEXT, correo TEXT, rol TEXT);
    CREATE TABLE IF NOT EXISTS turnos (orden INTEGER PRIMARY KEY, codigo TEXT, paciente TEXT, consultorio TEXT, estado TEXT);
    CREATE TABLE IF NOT EXISTS bitacora (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT, clave TEXT, presencia INTEGER, resultado TEXT, motivo TEXT);
    """
)
db.commit()
lock = threading.Lock()


def ahora():
    return datetime.now(timezone.utc).isoformat()


def enviar(ruta, datos):
    datos.setdefault("creadoEn", ahora())
    with lock:
        if ruta.endswith("/occupancy"):
            db.execute("DELETE FROM cola WHERE ruta = ?", (ruta,))
        db.execute("INSERT INTO cola (ruta, cuerpo) VALUES (?, ?)", (ruta, json.dumps(datos)))
        db.commit()


def registrar_acceso(clave, presencia, resultado, motivo=""):
    with lock:
        db.execute(
            "INSERT INTO bitacora (fecha, clave, presencia, resultado, motivo) VALUES (?, ?, ?, ?, ?)",
            (ahora(), clave, int(presencia), resultado, motivo),
        )
        db.commit()
    datos = {"uidLeido": clave, "presencia": presencia, "resultado": resultado}
    if motivo:
        datos["motivo"] = motivo
    enviar("/api/v1/device/scan", datos)


def total_usuarios():
    with lock:
        return db.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]


def actualizar_usuarios():
    try:
        with urllib.request.urlopen(API + "/api/smoke/usuarios", timeout=5) as r:
            datos = json.loads(r.read())
        filas = [(u["id"], u["nombre"], u["correo"], str(u.get("rol", ""))) for u in datos]
        with lock:
            with db:
                db.execute("DELETE FROM usuarios")
                db.executemany("INSERT INTO usuarios VALUES (?, ?, ?, ?)", filas)
        return True
    except Exception as e:
        print("No se pudo consultar usuarios, se usa la copia local:", e)
        return False


def _buscar_local(clave):
    buscado = clave.strip().casefold()
    with lock:
        filas = db.execute("SELECT nombre, correo, rol FROM usuarios").fetchall()
    for campo in (1, 0):
        coincidencias = [f for f in filas if (f[campo] or "").casefold() == buscado]
        if len(coincidencias) == 1:
            return {"nombre": coincidencias[0][0], "correo": coincidencias[0][1], "rol": coincidencias[0][2]}
    return None


def buscar_usuario(clave):
    encontrado = _buscar_local(clave)
    if encontrado is None and actualizar_usuarios():
        encontrado = _buscar_local(clave)
    return encontrado


def actualizar_turnos():
    with urllib.request.urlopen(API + "/api/smoke/turnos", timeout=5) as r:
        datos = json.loads(r.read())
    filas = []
    for orden, t in enumerate(datos):
        estado = t["estado"]
        if isinstance(estado, int):
            estado = ESTADOS[estado]
        filas.append((orden, t["codigo"], t["paciente"], t["consultorio"], estado))
    with lock:
        with db:
            db.execute("DELETE FROM turnos")
            db.executemany("INSERT INTO turnos VALUES (?, ?, ?, ?, ?)", filas)


def _turno(consulta, parametros=()):
    with lock:
        f = db.execute("SELECT codigo, paciente, consultorio, estado FROM turnos " + consulta, parametros).fetchone()
    return None if f is None else {"codigo": f[0], "paciente": f[1], "consultorio": f[2], "estado": f[3]}


def siguiente_turno():
    return _turno("WHERE estado = 'Llamado' ORDER BY orden DESC LIMIT 1") or _turno("WHERE estado = 'EnEspera' ORDER BY orden LIMIT 1")


def turno_de(nombre):
    return _turno("WHERE paciente = ? AND estado IN ('EnEspera', 'Llamado') ORDER BY orden LIMIT 1", (nombre,))


def es_su_turno(nombre):
    siguiente = siguiente_turno()
    if siguiente is not None and siguiente["paciente"] == nombre:
        return True, ""
    if _turno("WHERE paciente = ? AND estado IN ('Llamado', 'EnConsulta')", (nombre,)):
        return True, ""
    if turno_de(nombre):
        return False, "No es su turno"
    return False, "Sin turno"


def _sincronizar_turnos():
    con_error = False
    while True:
        try:
            actualizar_turnos()
            con_error = False
        except Exception as e:
            if not con_error:
                print("No se pudieron consultar turnos, se usa la copia local:", e)
            con_error = True
        time.sleep(REFRESCO_TURNOS_S)


def _sincronizar_usuarios():
    while True:
        actualizar_usuarios()
        time.sleep(REFRESCO_USUARIOS_S)


def iniciar_sincronizacion():
    threading.Thread(target=_sincronizar_usuarios, daemon=True).start()
    threading.Thread(target=_sincronizar_turnos, daemon=True).start()


def _post(ruta, cuerpo):
    req = urllib.request.Request(API + ruta, cuerpo.encode(), {"Content-Type": "application/json", "X-Device-Key": KEY})
    urllib.request.urlopen(req, timeout=60).close()


def _worker():
    while True:
        with lock:
            fila = db.execute("SELECT id, ruta, cuerpo FROM cola ORDER BY id LIMIT 1").fetchone()
        if fila is None:
            time.sleep(1)
            continue
        try:
            _post(fila[1], fila[2])
        except urllib.error.HTTPError as e:
            print("API respondio", e.code)
            if e.code != 400:
                time.sleep(5)
                continue
        except Exception as e:
            print("Sin conexion con la API:", e)
            time.sleep(5)
            continue
        with lock:
            db.execute("DELETE FROM cola WHERE id = ?", (fila[0],))
            db.commit()


def contar_personas(ruta_foto):
    endpoint = os.environ.get("")
    clave = os.environ.get("")
    if not endpoint or not clave:
        return
    try:
        url = endpoint.rstrip("/") + "/computervision/imageanalysis:analyze?api-version=2023-10-01&features=people"
        with open(ruta_foto, "rb") as f:
            req = urllib.request.Request(url, f.read(), {"Ocp-Apim-Subscription-Key": clave, "Content-Type": "application/octet-stream"})
        with urllib.request.urlopen(req, timeout=15) as r:
            resultado = json.loads(r.read())
        valores = resultado.get("peopleResult", {}).get("values", [])
        personas = sum(1 for p in valores if p.get("confidence", 0) >= 0.5)
        print("Personas en la foto:", personas)
        enviar("/api/v1/device/occupancy", {"personas": personas})
    except Exception as e:
        print("No se pudo contar personas:", e)


threading.Thread(target=_worker, daemon=True).start()
