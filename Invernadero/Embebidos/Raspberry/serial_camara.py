import os
import time
import threading
from datetime import datetime
from azure.storage.blob import BlobServiceClient
import serial

#CONFIGURACIÓN
PUERTO_SERIAL = '/dev/ttyUSB0'
BAUD_RATE = 115200

CONNECTION_STRING = ""
CONTAINER_NAME = "BlobInvernadero"

#Función para leer el puerto serial (Corre en segundo plano continuamente)
def escuchar_serial():
    print(f"Iniciando escucha del puerto serial en {PUERTO_SERIAL}...")
    try:
        puerto = serial.Serial(PUERTO_SERIAL, BAUD_RATE, timeout=1)
        puerto.flush()
        
        while True:
            if puerto.in_waiting > 0:
                linea = puerto.readline().decode('utf-8', errors='ignore').rstrip()
                if linea:
                    print(f"[SERIAL] {linea}")
            # Pequeña pausa para no saturar el procesador
            time.sleep(0.1) 
            
    except Exception as e:
        print(f"[ERROR SERIAL] No se pudo abrir el puerto: {e}")

# Función para tomar la foto y subirla a Azure
def tomar_y_subir_foto():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nombre_archivo = f"foto_{timestamp}.jpg"
    
    comando_camara = f"libcamera-still -o {nombre_archivo} --width 1280 --height 720 --nopreview"
    resultado = os.system(comando_camara)
    
    if resultado != 0:
        print(f"[{timestamp}] Error al capturar la foto.")
        return

    try:
        blob_service_client = BlobServiceClient.from_connection_string(CONNECTION_STRING)
        blob_client = blob_service_client.get_blob_client(container=CONTAINER_NAME, blob=nombre_archivo)

        with open(nombre_archivo, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)
        
        print(f"[{timestamp}] Foto {nombre_archivo} subida a Azure.")
        
    except Exception as e:
        print(f"[{timestamp}] Error al subir a Azure: {e}")
        
    finally:
        if os.path.exists(nombre_archivo):
            os.remove(nombre_archivo)

# Bucle para programar las 10 fotos por hora (cada 360 segundos / 6 minutos)
def bucle_camara():
    # 360 s * 10 veces = 10 veces por hora
    intervalo_segundos = 360 
    
    print("Iniciando servicio de cámara y subida a Azure...")
    while True:
        tomar_y_subir_foto()
        time.sleep(intervalo_segundos)

# --- PROGRAMA PRINCIPAL ---
if __name__ == "__main__":
    # leemos el puerto serial sin bloquear el programa
    hilo_serial = threading.Thread(target=escuchar_serial, daemon=True)
    hilo_serial.start()

    # Ejecutamos el bucle de la cámara en en main
    try:
        bucle_camara()
    except KeyboardInterrupt:
        print("\nPrograma detenido por el usuario.")


        