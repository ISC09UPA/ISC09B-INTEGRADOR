import base64
import os
import threading
import time
from datetime import datetime
from urllib.parse import quote

import cv2
import requests
#------------------------------------------------------------------ blob storage
try:
    from azure.storage.blob import BlobServiceClient
except ImportError:
    BlobServiceClient = None
#------------------------------------------------------------------ email
try:
    from azure.communication.email import EmailClient
except ImportError:
    EmailClient = None
#------------------------------------------------------------------ custom vision
from azure_config import ENDPOINT, KEY, PROJECT_ID, PUBLISHED_NAME, UMBRAL
#------------------------------------------------------------------ blob storage
from azure_config import BLOB_CONNECTION_STRING, BLOB_CONTAINER
try:
    from azure_config import BLOB_ACCOUNT_NAME
except ImportError:
    BLOB_ACCOUNT_NAME = ""
#------------------------------------------------------------------ email
from azure_config import EMAIL_CONNECTION_STRING, EMAIL_REMITENTE, EMAIL_ADMIN

#------------------------------------------------------------------ custom vision
URL = (
    f"{ENDPOINT.rstrip('/')}/customvision/v3.0/Prediction/{PROJECT_ID}"
    f"/classify/iterations/{quote(PUBLISHED_NAME)}/image"
)
# tags que nunca abren la puerta aunque saquen buen porcentaje
TAGS_NO_PERMITIDOS = {"desconocido", "unknown", "negative"}

# segundos minimos entre un correo y otro (si no, llegan 20 correos seguidos)
CORREO_ESPERA = 60


#------------------------------------------------------------------ revisar config
def _cadena_blob():
    """Sirve la cadena completa, o arma una con BLOB_ACCOUNT_NAME + la clave de la cuenta."""
    if "AccountName=" in BLOB_CONNECTION_STRING:
        return BLOB_CONNECTION_STRING
    if BLOB_ACCOUNT_NAME and "PON_AQUI" not in BLOB_ACCOUNT_NAME:
        return (f"DefaultEndpointsProtocol=https;AccountName={BLOB_ACCOUNT_NAME};"
                f"AccountKey={BLOB_CONNECTION_STRING};EndpointSuffix=core.windows.net")
    return None


def verificar_config():
    """Regresa una lista con lo que falta o esta mal en azure_config.py."""
    problemas = []
    if _cadena_blob() is None:
        problemas.append(
            "Blob: falta BLOB_ACCOUNT_NAME en azure_config.py (el nombre de la cuenta de almacenamiento, "
            "sale en Access keys como 'Storage account name'), o pega la Connection string completa")
    if "xxxxxxxx" in EMAIL_REMITENTE or "@" not in EMAIL_REMITENTE:
        problemas.append("EMAIL_REMITENTE sigue con el texto de ejemplo (pon el MailFrom de casalink-email)")
    if "@" not in str(EMAIL_ADMIN) or "CORREO_DEL" in str(EMAIL_ADMIN):
        problemas.append("EMAIL_ADMIN sigue con el texto de ejemplo (pon el correo que recibe las alertas)")
    if BlobServiceClient is None:
        problemas.append("falta instalar azure-storage-blob")
    if EmailClient is None:
        problemas.append("falta instalar azure-communication-email")
    return problemas


#------------------------------------------------------------------ cámara
INDICE_CAMARA = None   # None = la busca sola. Si quieres forzarla pon el numero (2 = /dev/video2)

_cam = None
_cam_lock = threading.Lock()
_sin_camara_hasta = 0   # si no se encontro, no vuelve a buscar hasta esta hora


def _abrir_indice(i):
    cam = cv2.VideoCapture(i, cv2.CAP_V4L2)
    # MJPG pesa menos por USB, con el formato por defecto muchas webcams se traban
    cam.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cam.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cam


class _CamaraPiCSI:
    """Envuelve picamera2 (camara del puerto CSI) para usarla igual que cv2.VideoCapture."""
    def __init__(self):
        from picamera2 import Picamera2
        self.p = Picamera2()
        self.p.configure(self.p.create_still_configuration(main={"size": (640, 480), "format": "RGB888"}))
        self.p.start()
        try:
            # la Camera Module 3 (imx708) tiene autofocus, se deja en continuo
            self.p.set_controls({"AfMode": 2})
        except Exception:
            pass
        time.sleep(2)           # deja que ajuste exposicion y enfoque
        self.abierta = True

    def isOpened(self):
        return self.abierta

    def read(self):
        try:
            return True, self.p.capture_array()   # "RGB888" ya viene en orden BGR, sirve para cv2
        except Exception:
            return False, None

    def release(self):
        try:
            self.p.stop()
            self.p.close()
        except Exception:
            pass
        self.abierta = False


def _buscar_camara():
    if INDICE_CAMARA is not None:
        return _abrir_indice(INDICE_CAMARA)

    # la Pi tiene nodos propios (unicam, isp, codec) que no son la webcam USB
    ignorar = ("unicam", "bcm2835", "rpi", "pisp", "codec", "isp", "hevc")
    carpeta = "/sys/class/video4linux"
    try:
        # hay otros nodos como v4l-subdev0 que no son camaras, por eso se filtra
        nodos = sorted((n for n in os.listdir(carpeta) if n.startswith("video") and n[5:].isdigit()),
                       key=lambda n: int(n[5:]))
    except OSError:
        nodos = []
    for nodo in nodos:
        try:
            nombre = open(f"{carpeta}/{nodo}/name").read().strip().lower()
        except OSError:
            continue
        if any(p in nombre for p in ignorar):
            continue
        cam = _abrir_indice(int(nodo[5:]))
        if cam.isOpened():
            ok, _ = cam.read()
            if ok:
                print(f"Camara encontrada en /dev/{nodo} ({nombre})")
                return cam
        cam.release()

    # si no hay webcam USB, se prueba con la camara del puerto CSI de la Pi
    try:
        from picamera2 import Picamera2
        if Picamera2.global_camera_info():
            cam = _CamaraPiCSI()
            print("Camara de la Pi (puerto CSI) encontrada con picamera2")
            return cam
    except Exception as e:
        print("picamera2 no disponible:", e)

    print("No se encontro ninguna camara (ni webcam USB ni camara CSI)")
    print("  revisa con: lsusb | v4l2-ctl --list-devices | rpicam-hello --list-cameras")
    return None


def capturar_frame():
    """Toma una foto de la webcam. Regresa la imagen (numpy) o None si no se pudo."""
    global _cam, _sin_camara_hasta
    with _cam_lock:
        for intento in range(2):
            if _cam is None or not _cam.isOpened():
                if time.time() < _sin_camara_hasta:
                    return None
                _cam = _buscar_camara()
                if _cam is None:
                    _sin_camara_hasta = time.time() + 20
                    return None
            # se tiran unos frames para que la camara ajuste la exposicion
            for _ in range(3):
                _cam.read()
            ok, frame = _cam.read()
            if ok:
                return frame
            # si falla se cierra y se vuelve a abrir una vez
            _cam.release()
            _cam = None
    return None


def liberar_camara():
    global _cam
    with _cam_lock:
        if _cam is not None:
            _cam.release()
            _cam = None


def frame_a_jpg(frame):
    ok, buffer = cv2.imencode(".jpg", frame)
    return buffer.tobytes() if ok else None


def capturar_foto():
    """Igual que antes: regresa la foto ya en bytes jpg."""
    frame = capturar_frame()
    if frame is None:
        raise RuntimeError("No se pudo leer la camara")
    return frame_a_jpg(frame)


#------------------------------------------------------------------ detector de caras (opcional)
_detector = None
_detector_buscado = False


def hay_cara(frame):
    """True si se ve una cara. Si no hay xml del detector, deja pasar la foto y que decida Azure."""
    global _detector, _detector_buscado
    if not _detector_buscado:
        _detector_buscado = True
        rutas = []
        if hasattr(cv2, "data"):
            rutas.append(cv2.data.haarcascades)
        rutas += ["/usr/share/opencv4/haarcascades/", "/usr/share/opencv/haarcascades/",
                  os.path.dirname(os.path.abspath(__file__)) + "/"]
        for ruta in rutas:
            archivo = ruta + "haarcascade_frontalface_default.xml"
            if os.path.exists(archivo):
                _detector = cv2.CascadeClassifier(archivo)
                break
        if _detector is None:
            print("AVISO: no encontre haarcascade_frontalface_default.xml, no se filtran fotos sin cara")
    if _detector is None:
        return True
    gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return len(_detector.detectMultiScale(gris, 1.2, 5, minSize=(80, 80))) > 0


#------------------------------------------------------------------ custom vision
def reconocer(foto):
    """Manda la foto (bytes jpg) a Custom Vision. Regresa (autorizado, nombre, prob)."""
    headers = {
        "Prediction-Key": KEY,
        "Content-Type": "application/octet-stream",
    }
    r = requests.post(URL, headers=headers, data=foto, timeout=8)
    if r.status_code != 200:
        raise RuntimeError(f"Custom Vision respondio {r.status_code}: {r.text[:150]}")
    predicciones = r.json().get("predictions", [])
    if not predicciones:
        return False, None, 0.0
    mejor = max(predicciones, key=lambda p: p["probability"])
    nombre = mejor["tagName"]
    prob = mejor["probability"]
    autorizado = prob >= UMBRAL and nombre.lower() not in TAGS_NO_PERMITIDOS
    return autorizado, nombre, prob


#------------------------------------------------------------------ email
_cliente_correo = None
_ultimo_correo = 0
_lock_correo = threading.Lock()


def enviar_alerta(foto, nombre, prob, zona="puerta"):
    global _cliente_correo, _ultimo_correo
    if EmailClient is None:
        print("Correo apagado: falta instalar azure-communication-email")
        return
    if "xxxxxxxx" in EMAIL_REMITENTE or "CORREO_DEL" in str(EMAIL_ADMIN):
        print("Correo apagado: falta EMAIL_REMITENTE o EMAIL_ADMIN en azure_config.py")
        return

    with _lock_correo:
        if time.time() - _ultimo_correo < CORREO_ESPERA:
            print("Correo omitido: ya se mando uno hace menos de un minuto")
            return
        _ultimo_correo = time.time()

    destinos = [EMAIL_ADMIN] if isinstance(EMAIL_ADMIN, str) else list(EMAIL_ADMIN)
    try:
        if _cliente_correo is None:
            _cliente_correo = EmailClient.from_connection_string(EMAIL_CONNECTION_STRING)
        texto = (
            "Una persona no cumplio el umbral de reconocimiento.\n\n"
            f"Zona: {zona}\n"
            f"Mejor coincidencia: {nombre or 'ninguna'} con {prob * 100:.1f}%\n"
            f"Porcentaje requerido: {UMBRAL * 100:.0f}%\n"
            f"Fecha: {datetime.now():%d/%m/%Y %H:%M:%S}\n\n"
            "La foto va adjunta."
        )
        mensaje = {
            "senderAddress": EMAIL_REMITENTE,
            "recipients": {"to": [{"address": d} for d in destinos]},
            "content": {
                "subject": f"Alerta: alguien intenta entrar a tu casa ({zona})",
                "plainText": texto,
                "html": "<html><body>" + texto.replace("\n", "<br>") + "</body></html>",
            },
            "attachments": [
                {
                    "name": "visitante.jpg",
                    "contentType": "image/jpeg",
                    "contentInBase64": base64.b64encode(foto).decode(),
                }
            ],
        }
        _cliente_correo.begin_send(mensaje).result()
        print("Alerta enviada por correo al administrador")
    except Exception as e:
        print(f"Error al enviar correo: {e}")


#------------------------------------------------------------------ blob storage
_cliente_blob = None


def subir_foto(imagen, autorizado, nombre, prob, zona="puerta"):
    global _cliente_blob
    if BlobServiceClient is None:
        print("Blob apagado: falta instalar azure-storage-blob")
        return
    cadena = _cadena_blob()
    if cadena is None:
        print("Blob apagado: falta BLOB_ACCOUNT_NAME en azure_config.py")
        return
    try:
        ahora = datetime.now()
        resultado = "autorizado" if autorizado else "denegado"
        etiqueta = str(nombre or "desconocido").replace(" ", "_")
        ruta = f"{ahora:%Y-%m-%d}/{ahora:%H-%M-%S}_{resultado}_{zona}_{etiqueta}.jpg"
        if _cliente_blob is None:
            _cliente_blob = BlobServiceClient.from_connection_string(cadena)
            try:
                _cliente_blob.create_container(BLOB_CONTAINER)
            except Exception:
                pass  # ya existia
        blob = _cliente_blob.get_blob_client(container=BLOB_CONTAINER, blob=ruta)
        blob.upload_blob(
            imagen,
            overwrite=True,
            metadata={"resultado": resultado, "probabilidad": f"{prob:.4f}"},
        )
        print(f"Foto guardada en Blob: {ruta}")
    except Exception as e:
        print(f"Error Blob Storage: {e}")


def registrar(foto, autorizado, nombre, prob, zona="puerta"):
    """Guarda la foto en Blob y, si no paso, manda el correo. Los dos van en hilos aparte."""
    if foto is None:
        print("No hay foto que guardar")
        return
    #---------------------------------------------------------- blob storage
    threading.Thread(
        target=subir_foto, args=(foto, autorizado, nombre, prob, zona), daemon=True
    ).start()
    #---------------------------------------------------------- email
    if not autorizado:
        threading.Thread(
            target=enviar_alerta, args=(foto, nombre, prob, zona), daemon=True
        ).start()


def rostro_autorizado():
    """Version corta (la usa el domotica.py del simulador): foto, reconocer y registrar."""
    foto = capturar_foto()
    autorizado, nombre, prob = reconocer(foto)
    registrar(foto, autorizado, nombre, prob)
    return autorizado, nombre, prob
