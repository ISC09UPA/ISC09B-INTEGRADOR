import threading
from datetime import datetime

import cv2
import requests
#------------------------------------------------------------------ blob storage
from azure.storage.blob import BlobServiceClient
#------------------------------------------------------------------ custom vision
from azure_config import ENDPOINT, KEY, PROJECT_ID, PUBLISHED_NAME, UMBRAL
#------------------------------------------------------------------ blob storage
from azure_config import BLOB_CONNECTION_STRING, BLOB_CONTAINER

#------------------------------------------------------------------ custom vision
URL = (
    f"{ENDPOINT.rstrip('/')}/customvision/v3.0/Prediction/{PROJECT_ID}"
    f"/classify/iterations/{PUBLISHED_NAME}/image"
)


#------------------------------------------------------------------ cámara
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


#------------------------------------------------------------------ blob storage
def subir_foto(imagen, autorizado, nombre, prob):
    try:
        ahora = datetime.now()
        resultado = "autorizado" if autorizado else "denegado"
        ruta = f"{ahora:%Y-%m-%d}/{ahora:%H-%M-%S}_{resultado}_{nombre}.jpg"
        cliente = BlobServiceClient.from_connection_string(BLOB_CONNECTION_STRING)
        blob = cliente.get_blob_client(container=BLOB_CONTAINER, blob=ruta)
        blob.upload_blob(
            imagen,
            overwrite=True,
            metadata={"resultado": resultado, "probabilidad": f"{prob:.4f}"},
        )
        print(f"Foto guardada en Blob: {ruta}")
    except Exception as e:
        print(f"Error Blob Storage: {e}")


def rostro_autorizado():
    foto = capturar_foto()
    #---------------------------------------------------------- custom vision
    headers = {
        "Prediction-Key": KEY,
        "Content-Type": "application/octet-stream",
    }
    r = requests.post(URL, headers=headers, data=foto, timeout=4)
    r.raise_for_status()
    mejor = max(r.json()["predictions"], key=lambda p: p["probability"])
    nombre = mejor["tagName"]
    prob = mejor["probability"]
    autorizado = prob >= UMBRAL and nombre.lower() != "desconocido"
    #---------------------------------------------------------- blob storage
    threading.Thread(
        target=subir_foto, args=(foto, autorizado, nombre, prob), daemon=True
    ).start()
    return autorizado, nombre, prob