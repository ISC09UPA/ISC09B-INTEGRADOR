#!/usr/bin/env python3
# Casa domotica con acceso facial - Raspberry Pi
# Pines segun la tabla de conexiones v3 (numeracion BCM)

import time
import threading

from smbus2 import SMBus
from gpiozero import LED, Buzzer, PWMOutputDevice, MotionSensor, AngularServo, Device

# Si tienes pigpio instalado los servos se mueven sin temblar
try:
    from gpiozero.pins.pigpio import PiGPIOFactory
    Device.pin_factory = PiGPIOFactory()
except Exception:
    pass

# ---------------- CONFIGURACION ----------------

# Los datos de Azure (Custom Vision, Blob y correo) estan en azure_config.py
# y toda la parte de camara, Azure, Blob y correo esta en custom_vision.py
from azure_config import UMBRAL
import custom_vision as cv

# Para probar servos, buzzers y leds sin reconocimiento facial: ponlo en True
# (ENTER en la terminal = persona autorizada y abre el servo, cualquier otra tecla + ENTER = intruso y suena el buzzer)
# Para usar el reconocimiento de verdad (camara + Azure, sin teclear nada) ponlo en False
FORZAR_PRUEBA = False
MODO_PRUEBA = FORZAR_PRUEBA

# Luz (lux). Abajo de LUX_BAJO se prenden, arriba de LUX_ALTO se apagan
LUX_BAJO = 30
LUX_ALTO = 80
CONFIRMACIONES = 3        # lecturas seguidas (cada 1 s) para cambiar de estado
LECTURAS_IGNORADAS = 2    # las primeras lecturas tras iniciar el sensor no son confiables

# Servos
ANGULO_CERRADO = 0
ANGULO_ABIERTO = 90
TIEMPO_ABIERTA = 5        # segundos que se queda abierta la puerta

# Alarma
TIEMPO_ALARMA = 4         # segundos que suena el buzzer
INTENTOS_CAMARA = 4       # veces que consulta a Azure antes de decidir que es intruso
VENTANA_CAMARA = 8        # segundos que espera a ver una cara despues de detectar movimiento
ESPERA_ENTRE_ACCESOS = 3  # segundos de descanso despues de cada intento

# ---------------- PINES ----------------

led_sala = LED(5)
led_hab1 = LED(6)
led_hab2 = LED(13)
led_cocina = LED(19)
led_exterior = LED(26)
led_alarma = LED(16)

pir_puerta = MotionSensor(17, queue_len=1)
pir_cochera = MotionSensor(27, queue_len=1)

def crear_servo(pin):
    return AngularServo(pin, initial_angle=ANGULO_CERRADO,
                        min_angle=0, max_angle=180,
                        min_pulse_width=0.0005, max_pulse_width=0.0025)

servo_puerta = crear_servo(18)
servo_cochera = crear_servo(12)

# Tipo de buzzer: "activo" (suena solo con corriente, trae circuito adentro)
# o "pasivo" (necesita una señal de frecuencia). Si el tuyo no suena prueba con el otro
# (con test_hardware.py puedes ver cual es)
# "pasivo" manda una señal de 2000 Hz: suena en buzzers pasivos y tambien en los activos,
# asi que es la opcion que casi siempre funciona. "activo" solo manda corriente fija
BUZZER_TIPO = "pasivo"
FRECUENCIA_BUZZER = 2000
# Solo define en que nivel se queda el pin cuando NO suena (para que no pite solo):
# modulos de 3 patas tipo "flying fish" -> True. Si pita todo el tiempo al arrancar, cambialo
BUZZER_ACTIVO_EN_BAJO = True

class Alarma:
    def __init__(self, pin):
        alto = not BUZZER_ACTIVO_EN_BAJO
        if BUZZER_TIPO == "pasivo":
            self.disp = PWMOutputDevice(pin, active_high=alto, frequency=FRECUENCIA_BUZZER, initial_value=0)
        else:
            self.disp = Buzzer(pin, active_high=alto, initial_value=False)

    def on(self):
        if BUZZER_TIPO == "pasivo":
            self.disp.value = 0.5
        else:
            self.disp.on()

    def off(self):
        if BUZZER_TIPO == "pasivo":
            self.disp.value = 0
        else:
            self.disp.off()

buzzer_puerta = Alarma(23)
buzzer_cochera = Alarma(22)

# Cada zona junta su sensor, servo, buzzer y led de alarma
# puerta: servo GPIO18, buzzer GPIO23, led rojo GPIO16
# cochera: servo GPIO12, buzzer GPIO22, led GPIO26
ZONAS = {
    "puerta": {"pir": pir_puerta, "servo": servo_puerta, "buzzer": buzzer_puerta, "led": led_alarma},
    "cochera": {"pir": pir_cochera, "servo": servo_cochera, "buzzer": buzzer_cochera, "led": led_exterior},
}

# ---------------- SENSORES DE LUZ BH1750 ----------------

BH1750_ADDR_1 = 0x23   # ADDR a GND
BH1750_ADDR_2 = 0x5C   # ADDR a 3.3V
MODO_CONT_ALTA_RES = 0x10

bus = SMBus(1)

# Muestra las lecturas de lux en la terminal para ajustar LUX_BAJO y LUX_ALTO
DEBUG_LUZ = True

def iniciar_bh1750(addr):
    bus.write_byte(addr, 0x01)  # power on
    time.sleep(0.01)
    bus.write_byte(addr, MODO_CONT_ALTA_RES)
    time.sleep(0.2)             # el sensor tarda en tener la primera medicion

def leer_lux(addr):
    datos = bus.read_i2c_block_data(addr, MODO_CONT_ALTA_RES, 2)
    return ((datos[0] << 8) | datos[1]) / 1.2

# Cada sensor de luz controla el led de su habitacion
# Sensor 1 -> led GPIO19 (cocina/pasillo), sensor 2 -> led GPIO6 (habitacion 1)
CUARTOS = [
    {"nombre": "Cuarto 1", "addr": BH1750_ADDR_1, "led": led_cocina, "oscuro": False, "lecturas": [], "cuenta": 0, "ignorar": LECTURAS_IGNORADAS},
    {"nombre": "Cuarto 2", "addr": BH1750_ADDR_2, "led": led_hab1, "oscuro": False, "lecturas": [], "cuenta": 0, "ignorar": LECTURAS_IGNORADAS},
]

def revisar_luz():
    for c in CUARTOS:
        try:
            lux = leer_lux(c["addr"])
        except OSError:
            # si el sensor se desconecta o se traba, se intenta iniciar de nuevo
            print(f"[LUZ] no se pudo leer {c['nombre']}, reintentando")
            try:
                iniciar_bh1750(c["addr"])
                c["ignorar"] = LECTURAS_IGNORADAS
            except OSError:
                pass
            continue

        # las primeras lecturas despues de iniciar suelen salir en 0 o muy bajas,
        # se tiran para que el led no se prenda solo al arrancar
        if c["ignorar"] > 0:
            c["ignorar"] -= 1
            if DEBUG_LUZ:
                print(f"[LUZ] {c['nombre']}: calibrando sensor ({lux:.0f} lux)")
            continue

        # promedio de las ultimas 3 lecturas para que una sombra rapida no lo mueva
        c["lecturas"].append(lux)
        c["lecturas"] = c["lecturas"][-3:]
        prom = sum(c["lecturas"]) / len(c["lecturas"])

        # que lado de los limites toca esta lectura (histeresis: entre los dos no cambia nada)
        if prom < LUX_BAJO:
            quiere = True
        elif prom > LUX_ALTO:
            quiere = False
        else:
            quiere = c["oscuro"]

        # solo cambia de estado si lo pide varias lecturas seguidas
        if quiere != c["oscuro"]:
            c["cuenta"] += 1
            if c["cuenta"] >= CONFIRMACIONES:
                c["oscuro"] = quiere
                c["cuenta"] = 0
                print(f"[LUZ] {c['nombre']}: {prom:.0f} lux -> led {'ON' if c['oscuro'] else 'OFF'}")
        else:
            c["cuenta"] = 0

        c["led"].value = 1 if c["oscuro"] else 0

        if DEBUG_LUZ:
            print(f"[LUZ] {c['nombre']}: {prom:.0f} lux | led {'ON' if c['oscuro'] else 'OFF'}")

def hilo_luz():
    # corre aparte para que la luz siga funcionando aunque el programa este
    # esperando la camara, abriendo la puerta o con la alarma sonando
    while True:
        try:
            revisar_luz()
        except Exception as e:
            print("[LUZ] error:", e)
        time.sleep(1)

# ---------------- RECONOCIMIENTO FACIAL ----------------

def persona_autorizada():
    """Regresa (ok, nombre, probabilidad, foto). La foto es la mejor que se tomo (bytes jpg)."""
    if MODO_PRUEBA:
        resp = input("[PRUEBA] ENTER = persona autorizada, otra tecla + ENTER = intruso: ")
        frame = cv.capturar_frame()
        foto = cv.frame_a_jpg(frame) if frame is not None else None
        return (resp.strip() == ""), "persona de prueba", 1.0, foto

    ultima = None        # ultima foto tomada (por si nunca se ve una cara)
    ultima_cara = None   # ultima foto donde si se vio una cara
    mejor_nombre, mejor_prob = None, 0.0
    consultas = 0
    fin = time.time() + VENTANA_CAMARA

    # el PIR se activa antes de que la persona mire a la camara, por eso se le da una ventana
    while time.time() < fin and consultas < INTENTOS_CAMARA:
        frame = cv.capturar_frame()
        if frame is None:
            print("[CAMARA] no se pudo leer la camara")
            time.sleep(0.5)
            continue
        foto = cv.frame_a_jpg(frame)
        ultima = foto
        if not cv.hay_cara(frame):
            time.sleep(0.3)
            continue
        ultima_cara = foto

        try:
            ok, nombre, prob = cv.reconocer(foto)
        except Exception as e:
            print("[AZURE] error:", e)
            consultas += 1
            time.sleep(0.5)
            continue
        consultas += 1
        print(f"Custom Vision: {nombre} {prob * 100:.1f}%")
        if ok:
            return True, nombre, prob, foto
        if prob > mejor_prob:
            mejor_nombre, mejor_prob = nombre, prob
        time.sleep(0.5)

    return False, mejor_nombre, mejor_prob, (ultima_cara if ultima_cara is not None else ultima)

# ---------------- ACCIONES ----------------

def abrir_puerta(zona):
    print(f"[{zona.upper()}] acceso permitido, abriendo")
    servo = ZONAS[zona]["servo"]
    servo.angle = ANGULO_ABIERTO
    time.sleep(TIEMPO_ABIERTA)
    servo.angle = ANGULO_CERRADO
    time.sleep(0.6)
    servo.detach()  # para que el servo no se quede forzando

def alarma(zona):
    print(f"[{zona.upper()}] acceso DENEGADO, alarma")
    buzzer = ZONAS[zona]["buzzer"]
    led = ZONAS[zona]["led"]
    fin = time.time() + TIEMPO_ALARMA
    try:
        # led y buzzer de la zona prenden y apagan juntos (pitido intermitente)
        while time.time() < fin:
            led.on()
            buzzer.on()
            time.sleep(0.25)
            led.off()
            buzzer.off()
            time.sleep(0.25)
    finally:
        buzzer.off()
        led.off()

def procesar_acceso(zona):
    print(f"[{zona.upper()}] movimiento detectado")
    ok, nombre, prob, foto = persona_autorizada()

    # blob y correo corren en hilos aparte, no retrasan la puerta ni la alarma
    cv.registrar(foto, ok, nombre, prob, zona)

    if ok:
        print(f"[{zona.upper()}] bienvenido {nombre}")
        abrir_puerta(zona)
    else:
        alarma(zona)

# ---------------- PROGRAMA PRINCIPAL ----------------

def main():
    iniciar_bh1750(BH1750_ADDR_1)
    iniciar_bh1750(BH1750_ADDR_2)

    if MODO_PRUEBA:
        print("MODO PRUEBA: ENTER = autorizado (servo), letra + ENTER = intruso (buzzer y led rojo)")
    problemas = cv.verificar_config()
    if problemas:
        print("REVISAR azure_config.py:")
        for p in problemas:
            print("  -", p)
    else:
        print("Azure listo: Custom Vision, Blob y correo configurados")

    if not MODO_PRUEBA:
        print("Abriendo camara...")
        if cv.capturar_frame() is None:
            print("AVISO: la camara no responde, sin ella todo acceso se va a denegar")
        else:
            print("Camara lista")

    print("Dejando que los PIR se calibren (10 s)...")
    time.sleep(10)
    print("Sistema listo")

    threading.Thread(target=hilo_luz, daemon=True).start()
    try:
        while True:
            for zona, datos in ZONAS.items():
                if datos["pir"].motion_detected:
                    procesar_acceso(zona)
                    time.sleep(ESPERA_ENTRE_ACCESOS)

            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nApagando sistema...")
    finally:
        cv.liberar_camara()
        for l in (led_sala, led_hab1, led_hab2, led_cocina, led_exterior, led_alarma):
            l.off()
        buzzer_puerta.off()
        buzzer_cochera.off()

if __name__ == "__main__":
    main()
