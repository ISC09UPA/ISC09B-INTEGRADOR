"""
Casa domótica (ATmega2560) convertida a Python.

Los registros del AVR (PORTB, PINA, ADC, UART...) se sustituyen por una capa de
hardware simulada (ENTRADAS / SALIDAS / ADC_CANALES / stdin como UART RX).
Para una placa real (MicroPython, Raspberry Pi) solo hay que reemplazar
leer_pin(), escribir_pin(), leer_adc_crudo(), ventilador() y la UART.

Comandos por teclado (+ Enter): o, 1, 2, 3, a, +, -
"""
import sys
import time
import threading
from collections import deque
#-------------------------------------------------------------------- custom vision
from custom_vision import rostro_autorizado


# ------------------------------------------------------------------ constantes
TIEMPO_CHAPA_MS = 5000
MAX_FALLOS = 3
TIEMPO_BLOQUEO_MS = 60000
TIEMPO_LUZ_MS = 120000
VENTANA_ROSTRO_MS = 5000
HISTERESIS10 = 10
UMBRAL_OSCURO_MV = 1000
UMBRAL_CLARO_MV = 1400
UMBRAL_GAS_MV = 1500
FIN_GAS_MV = 1200
T_PRECALENT_MS = 60000
MUESTRAS = 8
SP_MIN10 = 180
SP_MAX10 = 300
PERIODO_CLIMA_MS = 5000
PERIODO_TEL_MS = 10000

MASK32 = 0xFFFFFFFF


# ------------------------------------------------------------------ tiempo
def millis():
    return (time.monotonic_ns() // 1_000_000) & MASK32


def transcurrido(now, t0):
    """Resta con desbordamiento de 32 bits (como uint32_t en C)."""
    return (now - t0) & MASK32


# ------------------------------------------------------------------ UART
def uart_putc(c):
    sys.stdout.write(c)
    sys.stdout.flush()


def uart_puts(s):
    sys.stdout.write(s)
    sys.stdout.flush()


def uart_dec(n):
    uart_puts(str(int(n)))


def uart_tenths(v):
    if v < 0:
        uart_putc('-')
        v = -v
    uart_dec(v // 10)
    uart_putc('.')
    uart_putc(chr(ord('0') + (v % 10)))


def evento(tipo):
    uart_puts("EVENTO: " + tipo + "\r\n")


_rx = deque()


def _hilo_rx():
    """Simula UDR0/RXC0: lee caracteres del teclado en segundo plano."""
    while True:
        c = sys.stdin.read(1)
        if not c:
            break
        _rx.append(c)


# ------------------------------------------------------------------ hardware simulado
# Entradas: nivel lógico del pin (True = alto). Botones y reed son activos en bajo.
ENTRADAS = {
    "PA0": False,                                           # PIR puerta
    "PA1": False, "PA2": False, "PA3": False,               # PIR sala/recámara/cocina
    "PA4": True, "PA5": True, "PA6": True, "PA7": True,     # timbre, interior, reed, FACE_OK
    "PC0": True, "PC1": True, "PC2": True, "PC3": True,     # FACE_NO, SW0, SW1, SW2
}
SALIDAS = {
    "PB0": False,                                # chapa
    "PB1": False, "PB2": False, "PB3": False,    # luces sala, recámara, cocina
    "PB4": False,                                # luz puerta
    "PB5": False,                                # calefacción
    "PB6": False,                                # buzzer
    "PB7": False,                                # LED OK
    "PD7": False,                                # LED NO
}
# Cuentas del ADC (0..1023): 0=LDR, 1=gas, 2=potenciómetro setpoint, 3=temperatura
ADC_CANALES = [800, 100, 512, 500, 0, 0, 0, 0]
ventilador_duty = 0


def leer_pin(nombre):
    return ENTRADAS[nombre]


def escribir_pin(nombre, valor):
    SALIDAS[nombre] = bool(valor)


def leer_adc_crudo(canal):
    return ADC_CANALES[canal & 0x07]


# ------------------------------------------------------------------ botones
(B_TIMBRE, B_INT, B_OK, B_NO, B_SW0, B_SW1, B_SW2, B_N) = range(8)
_PIN_BOTON = ["PA4", "PA5", "PA7", "PC0", "PC1", "PC2", "PC3"]


class Boton:
    def __init__(self):
        self.state = False
        self.last = False
        self.t = 0
        self.edge = False


btn = [Boton() for _ in range(B_N)]


def leer_boton(i):
    """Activo en bajo: True si está presionado."""
    return not leer_pin(_PIN_BOTON[i])


def actualizar_botones(now):
    for i in range(B_N):
        raw = leer_boton(i)
        b = btn[i]
        if raw != b.last:
            b.last = raw
            b.t = now
        elif raw != b.state and transcurrido(now, b.t) >= 30:
            b.state = raw
            if raw:
                b.edge = True


def tomar_edge(i):
    if btn[i].edge:
        btn[i].edge = False
        return True
    return False


# ------------------------------------------------------------------ sensores
def PIR_PUERTA():
    return leer_pin("PA0")


def pir_hab(h):
    return leer_pin("PA%d" % (1 + h))


def REED_CERRADA():
    return not leer_pin("PA6")


# ------------------------------------------------------------------ actuadores
def CHAPA_ON():
    escribir_pin("PB0", True)


def CHAPA_OFF():
    escribir_pin("PB0", False)


def LUZ_PUERTA(x):
    escribir_pin("PB4", x)


def CALEF(x):
    escribir_pin("PB5", x)


def BUZZER(x):
    escribir_pin("PB6", x)


def LED_OK(x):
    escribir_pin("PB7", x)


def LED_NO(x):
    escribir_pin("PD7", x)


def luz_estado(h):
    return SALIDAS["PB%d" % (1 + h)]


def luz_set(h, on):
    escribir_pin("PB%d" % (1 + h), on)


def ventilador(duty):
    """PWM 0..255 en PE3 (OC3A). Aquí solo se guarda el valor."""
    global ventilador_duty
    ventilador_duty = int(duty)


def beep(n):
    while n > 0:
        n -= 1
        BUZZER(1)
        time.sleep(0.1)
        BUZZER(0)
        time.sleep(0.1)


# ------------------------------------------------------------------ ADC
def leer_adc(canal):
    suma = 0
    for _ in range(MUESTRAS):
        suma += leer_adc_crudo(canal)
    return suma // MUESTRAS


def a_mv(cuentas):
    return (cuentas * 5000) // 1023


# ------------------------------------------------------------------ estado global
modo_auto = [True, True, True]
oscuro = False
alarma_gas = False
setpoint10 = 250
temp10 = 250
mv_ldr = 0
mv_gas = 0
fallos = 0
bloqueado_hasta = 0
chapa_hasta = 0
nombres = ["sala", "recamara", "cocina"]


def abrir_chapa(now):
    global chapa_hasta
    CHAPA_ON()
    LED_OK(1)
    chapa_hasta = (now + TIEMPO_CHAPA_MS) & MASK32


# ------------------------------------------------------------------ control de acceso
ACC_IDLE, ACC_ESPERA, ACC_POST = range(3)
acc = ACC_IDLE
acc_t0 = 0
pir_prev = False


def tarea_acceso(now):
    global acc, acc_t0, pir_prev, fallos, bloqueado_hasta, chapa_hasta

    pir = PIR_PUERTA()
    pir_sube = pir and not pir_prev
    pir_prev = pir
    timbre = tomar_edge(B_TIMBRE)

    if acc == ACC_IDLE:
        if now < bloqueado_hasta:
            tomar_edge(B_INT)
        elif tomar_edge(B_INT):
            abrir_chapa(now)
            evento("APERTURA_INTERIOR")
        elif pir_sube or timbre:
            LUZ_PUERTA(1)
            tomar_edge(B_OK)
            tomar_edge(B_NO)
            uart_puts("Visitante detectado. Pulsa FACE_OK o FACE_NO (5 s)...\r\n")
            #---------------------------------------------------------- custom vision
            threading.Thread(target=reconocer_visitante, daemon=True).start()
            acc = ACC_ESPERA
            acc_t0 = now

    elif acc == ACC_ESPERA:
        ok = tomar_edge(B_OK)
        no = tomar_edge(B_NO)
        if not ok and not no and transcurrido(now, acc_t0) < VENTANA_ROSTRO_MS:
            pass  # sigue esperando
        else:
            if not ok and not no:
                evento("SIN_ROSTRO")
            elif ok and PIR_PUERTA():            # FUSION: rostro Y PIR
                abrir_chapa(now)
                beep(1)
                fallos = 0
                evento("ACCESO_PERMITIDO")
            else:
                fallos += 1
                LED_NO(1)
                beep(3)
                LED_NO(0)
                evento("ACCESO_DENEGADO")
                if fallos >= MAX_FALLOS:
                    bloqueado_hasta = (now + TIEMPO_BLOQUEO_MS) & MASK32
                    evento("ALERTA_BLOQUEO")
                    fallos = 0
            acc = ACC_POST
            acc_t0 = millis()

    elif acc == ACC_POST:
        if transcurrido(now, acc_t0) >= 3000:
            LUZ_PUERTA(0)
            acc = ACC_IDLE

    if chapa_hasta and now >= chapa_hasta:
        CHAPA_OFF()
        LED_OK(0)
        chapa_hasta = 0

#------------------------------------------------------------------- custom vision
def reconocer_visitante():
    try:
        autorizado, nombre, prob = rostro_autorizado()
        uart_puts("Custom Vision: %s %.1f%%\r\n" % (nombre, prob * 100))
    except Exception as e:
        uart_puts("Error Custom Vision: %s\r\n" % e)
        return
    pin = "PA7" if autorizado else "PC0"
    ENTRADAS[pin] = False
    time.sleep(0.2)
    ENTRADAS[pin] = True


# ------------------------------------------------------------------ luces
ultimo_mov = [0, 0, 0]


def tarea_luces(now):
    if tomar_edge(B_SW0):
        modo_auto[0] = False
        luz_set(0, not luz_estado(0))
    if tomar_edge(B_SW1):
        modo_auto[1] = False
        luz_set(1, not luz_estado(1))
    if tomar_edge(B_SW2):
        modo_auto[2] = False
        luz_set(2, not luz_estado(2))

    for h in range(3):
        if not modo_auto[h]:
            continue
        if pir_hab(h):
            ultimo_mov[h] = now
            if not luz_estado(h) and oscuro:
                luz_set(h, True)
        elif luz_estado(h) and transcurrido(now, ultimo_mov[h]) > TIEMPO_LUZ_MS:
            luz_set(h, False)


# ------------------------------------------------------------------ analógico (LDR, gas, setpoint, temperatura)
t_an = 0
ultimo_sp = -1000
cuenta_gas = 0
t_bz = 0
fase_bz = False


def tarea_analogico(now):
    global t_an, mv_ldr, mv_gas, temp10, oscuro, ultimo_sp, setpoint10
    global cuenta_gas, alarma_gas, t_bz, fase_bz

    if transcurrido(now, t_an) >= 1000:
        t_an = now
        mv_ldr = a_mv(leer_adc(0))
        mv_gas = a_mv(leer_adc(1))
        mv_sp = a_mv(leer_adc(2))
        mv_t = a_mv(leer_adc(3))

        temp10 = 100 + (mv_t * 300) // 5000          # 10..40 °C (en décimas)

        if mv_ldr < UMBRAL_OSCURO_MV:
            oscuro = True
        elif mv_ldr > UMBRAL_CLARO_MV:
            oscuro = False

        sp = SP_MIN10 + (mv_sp * (SP_MAX10 - SP_MIN10)) // 5000
        if ultimo_sp == -1000:
            ultimo_sp = sp
        elif sp - ultimo_sp >= 5 or ultimo_sp - sp >= 5:
            setpoint10 = ((sp + 2) // 5) * 5
            ultimo_sp = sp

        if now > T_PRECALENT_MS:
            cuenta_gas = cuenta_gas + 1 if mv_gas > UMBRAL_GAS_MV else 0
            if cuenta_gas >= 3 and not alarma_gas:
                alarma_gas = True
                evento("ALERTA_GAS")
            elif mv_gas < FIN_GAS_MV and alarma_gas:
                alarma_gas = False
                cuenta_gas = 0
                BUZZER(0)
                LED_NO(0)
                ventilador(0)
                evento("FIN_ALERTA_GAS")

    if alarma_gas and transcurrido(now, t_bz) >= 300:
        t_bz = now
        fase_bz = not fase_bz
        BUZZER(fase_bz)
        LED_NO(fase_bz)


# ------------------------------------------------------------------ clima
t_clima = 0


def tarea_clima(now):
    global t_clima
    if alarma_gas:
        ventilador(255)
        CALEF(0)
        return
    if transcurrido(now, t_clima) < PERIODO_CLIMA_MS:
        return
    t_clima = now
    if temp10 > setpoint10 + HISTERESIS10:
        d = 102 + (temp10 - setpoint10) * 4          # 0.4 + dT*0.15 aprox.
        ventilador(255 if d > 255 else d)
        CALEF(0)
    elif temp10 < setpoint10 - HISTERESIS10:
        ventilador(0)
        CALEF(1)


# ------------------------------------------------------------------ serial
def tarea_serial(now):
    global setpoint10
    if not _rx:
        return
    c = _rx.popleft()

    if c == 'o':
        abrir_chapa(now)
        evento("APERTURA_REMOTA")
    elif c in ('1', '2', '3'):
        h = ord(c) - ord('1')
        modo_auto[h] = False
        luz_set(h, not luz_estado(h))
        uart_puts("CMD luz ")
        uart_puts(nombres[h])
        uart_puts(" ON\r\n" if luz_estado(h) else " OFF\r\n")
    elif c == 'a':
        modo_auto[0] = modo_auto[1] = modo_auto[2] = True
        uart_puts("CMD modo auto\r\n")
    elif c == '+':
        if setpoint10 < SP_MAX10:
            setpoint10 += 5
        uart_puts("CMD setpoint=")
        uart_tenths(setpoint10)
        uart_puts("\r\n")
    elif c == '-':
        if setpoint10 > SP_MIN10:
            setpoint10 -= 5
        uart_puts("CMD setpoint=")
        uart_tenths(setpoint10)
        uart_puts("\r\n")


# ------------------------------------------------------------------ telemetría
t_tel = 0
reed_prev = True


def tarea_telemetria(now):
    global t_tel, reed_prev
    reed = REED_CERRADA()
    if reed != reed_prev:
        reed_prev = reed
        uart_puts("Puerta CERRADA\r\n" if reed else "Puerta ABIERTA\r\n")
    if transcurrido(now, t_tel) < PERIODO_TEL_MS:
        return
    t_tel = now
    uart_puts("TEL T=")
    uart_tenths(temp10)
    uart_puts("C SP=")
    uart_tenths(setpoint10)
    uart_puts("C LDR=")
    uart_dec(mv_ldr)
    uart_puts("mV GAS=")
    uart_dec(mv_gas)
    uart_puts("mV oscuro=")
    uart_dec(oscuro)
    uart_puts(" luces=")
    uart_dec(luz_estado(0))
    uart_dec(luz_estado(1))
    uart_dec(luz_estado(2))
    uart_puts(" gas=")
    uart_dec(alarma_gas)
    uart_puts("\r\n")


# ------------------------------------------------------------------ main
def main():
    threading.Thread(target=_hilo_rx, daemon=True).start()

    uart_puts("\r\n=== CASA DOMOTICA (ATmega2560) ===\r\n")
    uart_puts("Comandos: o=abrir  1/2/3=luz sala/rec/coc  a=modo auto  +/-=setpoint\r\n")
    a_mv(leer_adc(2))

    while True:
        now = millis()
        actualizar_botones(now)
        tarea_acceso(now)
        tarea_luces(now)
        tarea_analogico(now)
        tarea_clima(now)
        tarea_serial(now)
        tarea_telemetria(now)
        time.sleep(0.001)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass