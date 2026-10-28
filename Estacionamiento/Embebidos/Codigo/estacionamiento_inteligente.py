from time import sleep
from gpiozero import Button, LED, Servo

TOTAL_CAJONES = 4

# Sensores IR: la salida baja a 0 cuando hay un auto (confirmar con su módulo)
sensores = [Button(p, pull_up=True) for p in (5, 6, 13, 19)]
rojos = [LED(p) for p in (17, 27, 22, 23)]
verdes = [LED(p) for p in (24, 25, 16, 20)]
pluma = Servo(18)


def ocupados():
    return [s.is_pressed for s in sensores]


def libres():
    return TOTAL_CAJONES - sum(ocupados())


def actualizar_leds():
    for i, ocupado in enumerate(ocupados()):
        rojos[i].value = ocupado
        verdes[i].value = not ocupado


def abrir_pluma():
    pluma.max()
    sleep(3)  # tiempo para que pase el auto
    pluma.min()


def hay_vehiculo_en_pluma():
    ...  # HC-SR04 con distancia menor a un umbral, o un botón de prueba


def tomar_foto():
    ...  # picamera2 o webcam USB; devuelve la imagen


def consultar_a_azure(foto):
    ...  # sube la foto, manda mensaje a Service Bus y espera la respuesta
    # devuelve {'accion': 'abrir' o 'negar', 'tipo': 'entrada' o 'salida'}


def publicar_estado(estado):
    ...  # mensaje a Service Bus con los cajones que cambiaron


pluma.min()  # pluma cerrada al iniciar
estado_anterior = None

while True:
    estado = ocupados()
    if estado != estado_anterior:
        actualizar_leds()
        publicar_estado(estado)
        estado_anterior = estado

    if hay_vehiculo_en_pluma():
        respuesta = consultar_a_azure(tomar_foto())
        if respuesta['accion'] == 'abrir' and (respuesta['tipo'] == 'salida' or libres() > 0):
            abrir_pluma()
    sleep(0.5)