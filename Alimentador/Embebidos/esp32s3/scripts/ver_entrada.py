"""Guarda como PNG la imagen exacta que recibe el modelo en el ESP32-S3.

Uso (cierra antes el monitor serie de PlatformIO, el puerto no se puede compartir):

    pip install pyserial pillow
    python scripts/ver_entrada.py COM5

Manda VER_ENTRADA, imprime las probabilidades de cada clase y guarda entrada_<hora>.png
(el recorte de 96x96) y entrada_<hora>_x4.png (ampliada para verla mejor).
"""
import base64
import sys
import time

import serial
from PIL import Image

puerto = sys.argv[1] if len(sys.argv) > 1 else "COM5"

s = serial.Serial()
s.port = puerto
s.baudrate = 115200
s.timeout = 1
s.dtr = False  # que abrir el puerto no reinicie la placa
s.rts = False
s.open()
time.sleep(0.5)
s.reset_input_buffer()
s.write(b"VER_ENTRADA\n")

ancho = alto = 0
datos = []
leyendo = False
limite = time.time() + 30
while time.time() < limite:
    linea = s.readline().decode("utf-8", errors="replace").strip()
    if not linea:
        continue
    if linea.startswith("IMG_INICIO"):
        _, ancho, alto = linea.split()
        ancho, alto = int(ancho), int(alto)
        leyendo = True
    elif linea == "IMG_FIN":
        break
    elif leyendo:
        datos.append(linea)
    else:
        print(linea)
        if linea.startswith("ERROR"):
            sys.exit(1)
s.close()

if not datos:
    sys.exit("No llegó la imagen. ¿Está cerrado el monitor serie y es el puerto correcto?")

rgb = base64.b64decode("".join(datos))
img = Image.frombytes("RGB", (ancho, alto), rgb)
nombre = time.strftime("entrada_%H%M%S")
img.save(f"{nombre}.png")
img.resize((ancho * 4, alto * 4), Image.NEAREST).save(f"{nombre}_x4.png")
print(f"Guardada {nombre}.png ({ancho}x{alto}) y {nombre}_x4.png")
