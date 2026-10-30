import cv2
import requests
from azure_config import ENDPOINT, KEY, PROJECT_ID, PUBLISHED_NAME, UMBRAL

URL = (
    f"{ENDPOINT.rstrip('/')}/customvision/v3.0/Prediction/{PROJECT_ID}"
    f"/classify/iterations/{PUBLISHED_NAME}/image"
)


def capturar_foto():
    cam = cv2.VideoCapture(0)
    for _ in range(5):
        cam.read()
    ok, frame = cam.read()
    cam.release()
    if not ok:
        raise RuntimeError("No se pudo leer la camara")
    ok, buffer = cv2.imencode(".jpg", frame)
    return buffer.tobytes()


def rostro_autorizado():
    headers = {
        "Prediction-Key": KEY,
        "Content-Type": "application/octet-stream",
    }
    r = requests.post(URL, headers=headers, data=capturar_foto(), timeout=4)
    r.raise_for_status()
    mejor = max(r.json()["predictions"], key=lambda p: p["probability"])
    nombre = mejor["tagName"]
    prob = mejor["probability"]
    autorizado = prob >= UMBRAL and nombre.lower() != "desconocido"
    return autorizado, nombre, prob