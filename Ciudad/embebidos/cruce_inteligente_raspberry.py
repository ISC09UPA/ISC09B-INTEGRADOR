#!/usr/bin/env python3
"""
Cruce Inteligente - Raspberry Pi 4 (migracion del sketch de Arduino)
Modo FIJO y modo ADAPTATIVO, boton peatonal, boton de cambio de modo.

Pines BCM (numeracion GPIO de la Raspberry):
  IR_C1_LLEGADA GPIO17   IR_C1_PASO GPIO27
  IR_C2_LLEGADA GPIO22   IR_C2_PASO GPIO23
  BTN_PEATON    GPIO24
  BTN_MODO      GPIO20
  Semaforo 1: R GPIO5  A GPIO6   V GPIO13
  Semaforo 2: R GPIO19 A GPIO26  V GPIO16
  Modo:       R GPIO12 V GPIO25
  Buzzer      GPIO4
Entradas: modulo/boton a tierra, pull-up interna (activas en LOW).
Sensores y modulos alimentados a 3.3 V.

Uso en la Raspberry:  python3 cruce_inteligente_raspberry.py
Prueba en PC sin Raspberry:  SIMULAR=1 python3 cruce_inteligente_raspberry.py
"""
import json
import os
import random
import time
from collections import deque

SIMULAR = os.environ.get("SIMULAR") == "1"

if not SIMULAR:
    import RPi.GPIO as GPIO
else:
    class _GPIOFalso:
        BCM = OUT = IN = PUD_UP = 0
        HIGH, LOW = 1, 0
        def setmode(self, *a): pass
        def setwarnings(self, *a): pass
        def setup(self, *a, **k): pass
        def output(self, *a): pass
        def input(self, pin):
            # En simulacion: de vez en cuando "pasa" un vehiculo
            return 0 if random.random() < 0.03 else 1
        def cleanup(self): pass
    GPIO = _GPIOFalso()

# ---------------- Pines ----------------
IR_LLEGADA = [17, 22]
IR_PASO = [27, 23]
BTN_PEATON = 24
BTN_MODO = 20
SEM = [[5, 6, 13], [19, 26, 16]]   # rojo, amarillo, verde
MODO_R, MODO_V = 12, 25
BUZZER = 4

# ---------------- Tiempos (segundos) ----------------
VERDE_FIJO = 10
VERDE_MIN = 5
VERDE_MAX = 20
AMARILLO_T = 2
PEATON_T = 6
PEATON_MIN_V = 5          # verde minimo antes de atender al peaton
VENTANA_TEND = 30         # ventana de tendencia
ANTIREBOTE = 0.2
ARCHIVO_LOG = "telemetria_pendiente.jsonl"   # respaldo local (se enviara a Azure)

FIJO, ADAPTATIVO = "fijo", "adaptativo"
VERDE, AMARILLO, PEATON = "VERDE", "AMARILLO", "PEATON"


class Cruce:
    def __init__(self):
        self.modo = FIJO
        self.fase = VERDE
        self.carril = 0
        self.fase_inicio = 0.0
        self.duracion_verde = VERDE_FIJO
        self.ped_pendiente = False
        self.cola = [deque(), deque()]        # llegadas sin paso (marcas de tiempo)
        self.hist = [deque(), deque()]        # llegadas recientes (tendencia)
        self.total_llegadas = [0, 0]
        self.total_pasos = [0, 0]
        self.prev = {}                        # estado previo de cada entrada
        self.ultimo = {}                      # ultimo flanco (antirrebote)
        self.buzzer_t = 0.0
        self.buzzer_on = False

    # ---------- utilidades ----------
    def log(self, evento, **datos):
        registro = {"t": time.time(), "evento": evento, "modo": self.modo, **datos}
        print(registro)
        with open(ARCHIVO_LOG, "a") as f:
            f.write(json.dumps(registro) + "\n")

    def flanco(self, pin, ahora):
        """True cuando la entrada pasa de 1 a 0 (con antirrebote)."""
        v = GPIO.input(pin)
        ant = self.prev.get(pin, GPIO.HIGH)
        self.prev[pin] = v
        if ant == GPIO.HIGH and v == GPIO.LOW and ahora - self.ultimo.get(pin, 0) > ANTIREBOTE:
            self.ultimo[pin] = ahora
            return True
        return False

    def llegadas_recientes(self, c, ahora):
        while self.hist[c] and ahora - self.hist[c][0] > VENTANA_TEND:
            self.hist[c].popleft()
        return len(self.hist[c])

    # ---------- sensores ----------
    def registrar_llegada(self, c, ahora):
        self.total_llegadas[c] += 1
        self.cola[c].append(ahora)
        self.hist[c].append(ahora)
        self.log("llegada", carril=c + 1, cola=len(self.cola[c]))

    def registrar_paso(self, c, ahora):
        if not self.cola[c]:
            return
        espera = ahora - self.cola[c].popleft()
        self.total_pasos[c] += 1
        self.log("paso", carril=c + 1, espera_s=round(espera, 2))

    # ---------- semaforo ----------
    def calcular_verde(self, ahora):
        if self.modo == FIJO:
            return VERDE_FIJO
        t = VERDE_MIN + 2 * len(self.cola[self.carril]) + 1 * self.llegadas_recientes(self.carril, ahora)
        return max(VERDE_MIN, min(VERDE_MAX, t))

    def aplicar_luces(self):
        for s in SEM:
            for pin in s:
                GPIO.output(pin, GPIO.LOW)
        GPIO.output(MODO_R, self.modo == FIJO)
        GPIO.output(MODO_V, self.modo == ADAPTATIVO)
        if self.fase == PEATON:
            GPIO.output(SEM[0][0], GPIO.HIGH)
            GPIO.output(SEM[1][0], GPIO.HIGH)
            return
        otro = 1 - self.carril
        GPIO.output(SEM[otro][0], GPIO.HIGH)                       # el otro en rojo
        GPIO.output(SEM[self.carril][2 if self.fase == VERDE else 1], GPIO.HIGH)

    def iniciar_verde(self, ahora):
        self.fase = VERDE
        self.fase_inicio = ahora
        self.duracion_verde = self.calcular_verde(ahora)
        self.log("verde", carril=self.carril + 1,
                 cola=len(self.cola[self.carril]), duracion_s=self.duracion_verde)
        self.aplicar_luces()

    # ---------- ciclo principal ----------
    def paso_logica(self, ahora):
        # Lectura de sensores y botones
        for c in range(2):
            if self.flanco(IR_LLEGADA[c], ahora):
                self.registrar_llegada(c, ahora)
            if self.flanco(IR_PASO[c], ahora):
                self.registrar_paso(c, ahora)
        if self.flanco(BTN_PEATON, ahora):
            self.ped_pendiente = True
            self.log("peaton_solicita")
        if self.flanco(BTN_MODO, ahora):
            self.modo = ADAPTATIVO if self.modo == FIJO else FIJO
            self.log("cambio_modo")
            self.aplicar_luces()

        # Maquina de estados
        t = ahora - self.fase_inicio
        if self.fase == VERDE:
            if t >= self.duracion_verde or (self.ped_pendiente and t >= PEATON_MIN_V):
                self.fase, self.fase_inicio = AMARILLO, ahora
                self.aplicar_luces()
        elif self.fase == AMARILLO:
            if t >= AMARILLO_T:
                if self.ped_pendiente:
                    self.fase, self.fase_inicio = PEATON, ahora
                    self.aplicar_luces()
                    self.log("fase_peatonal")
                else:
                    self.carril = 1 - self.carril
                    self.iniciar_verde(ahora)
        elif self.fase == PEATON:
            if ahora - self.buzzer_t >= 0.3:          # buzzer intermitente
                self.buzzer_t = ahora
                self.buzzer_on = not self.buzzer_on
                GPIO.output(BUZZER, self.buzzer_on)
            if t >= PEATON_T:
                GPIO.output(BUZZER, GPIO.LOW)
                self.buzzer_on = False
                self.ped_pendiente = False
                self.carril = 1 - self.carril
                self.iniciar_verde(ahora)


def main():
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    for pin in IR_LLEGADA + IR_PASO + [BTN_PEATON, BTN_MODO]:
        GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    for s in SEM:
        for pin in s:
            GPIO.setup(pin, GPIO.OUT, initial=GPIO.LOW)
    for pin in (MODO_R, MODO_V, BUZZER):
        GPIO.setup(pin, GPIO.OUT, initial=GPIO.LOW)

    cruce = Cruce()
    print("Cruce inteligente listo (modo fijo). Ctrl+C para salir.")
    cruce.iniciar_verde(time.monotonic())
    try:
        while True:
            cruce.paso_logica(time.monotonic())
            time.sleep(0.01)                           # 10 ms por vuelta
    except KeyboardInterrupt:
        print("\nSaliendo...")
    finally:
        GPIO.cleanup()


if __name__ == "__main__":
    main()
