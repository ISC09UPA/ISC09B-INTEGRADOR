import os
import threading
import time
import unicodedata
from gpiozero import DigitalInputDevice, DigitalOutputDevice
from luma.core.interface.serial import i2c as luma_i2c
from luma.oled.device import ssd1306
from PIL import Image, ImageDraw, ImageFont
from smbus2 import SMBus, i2c_msg
import nube

try:
    from picamera2 import Picamera2
except ImportError:
    Picamera2 = None

I2C_BUS_NFC = 1
I2C_BUS_OLED = 1
CARPETA_FOTOS = os.path.expanduser("~/capturas")
CALENTAMIENTO_S = 30
VENTANA_PIR_MS = 5000
LED_VERDE_MS = 3000
FOTO_SALA_S = 60
ROLES_CON_ORDEN = {"paciente"}
LARGO_TEXTO = 32

SELECT_APDU = bytes([0x00, 0xA4, 0x04, 0x00, 0x07, 0xF0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06])

pir = DigitalInputDevice(17, pull_up=False)
led_verde = DigitalOutputDevice(23)
led_rojo = DigitalOutputDevice(24)
buzzer = DigitalOutputDevice(25)

oled = None
img = None
draw = None
fuente = ImageFont.load_default()
camara = None
accesos_ok = 0
accesos_denegados = 0


def ms():
    return time.monotonic() * 1000


def sleep_ms(t):
    time.sleep(t / 1000)


class PN532:
    def __init__(self, bus, addr=0x24):
        self.bus = bus
        self.addr = addr

    def _leer(self, n):
        msg = i2c_msg.read(self.addr, n)
        self.bus.i2c_rdwr(msg)
        return bytes(msg)

    def _escribir(self, datos):
        self.bus.i2c_rdwr(i2c_msg.write(self.addr, bytes(datos)))

    def _listo(self, timeout_ms):
        t0 = ms()
        while ms() - t0 < timeout_ms:
            try:
                if self._leer(1)[0] & 1:
                    return True
            except OSError:
                pass
            sleep_ms(5)
        return False

    def _extraer(self, datos, cmd):
        i = datos.find(b"\x00\x00\xff")
        if i < 0 or i + 5 > len(datos):
            return None
        n = datos[i + 3]
        if (n + datos[i + 4]) & 0xFF != 0:
            return None
        fin = i + 5 + n
        if fin >= len(datos):
            return None
        cuerpo = datos[i + 5:fin]
        if (sum(cuerpo) + datos[fin]) & 0xFF != 0:
            return None
        if len(cuerpo) < 2 or cuerpo[0] != 0xD5 or cuerpo[1] != cmd + 1:
            return None
        return cuerpo[2:]

    def _comando(self, cmd, datos=b"", timeout_ms=500):
        cuerpo = bytes([0xD4, cmd]) + bytes(datos)
        n = len(cuerpo)
        dcs = (-sum(cuerpo)) & 0xFF
        trama = bytes([0x00, 0x00, 0xFF, n, (-n) & 0xFF]) + cuerpo + bytes([dcs, 0x00])
        self._escribir(trama)
        if not self._listo(100):
            return None
        ack = self._leer(7)
        if ack[1:7] != b"\x00\x00\xff\x00\xff\x00":
            return None
        if not self._listo(timeout_ms):
            self._escribir(b"\x00\x00\xff\x00\xff\x00")
            return None
        buf = self._leer(64)
        return self._extraer(buf[1:], cmd)

    def iniciar(self):
        sleep_ms(100)
        for _ in range(3):
            try:
                version = self._comando(0x02, b"", 300)
                if version is not None and len(version) >= 4:
                    break
            except OSError:
                pass
            sleep_ms(200)
        else:
            return False
        if self._comando(0x14, b"\x01\x14\x01", 300) is None:
            return False
        self._comando(0x32, b"\x05\xff\x01\x0a", 300)
        return True

    def leer_objetivo(self):
        r = self._comando(0x4A, b"\x01\x00", 500)
        if r is None or len(r) < 7 or r[0] < 1:
            return None
        self.sak = r[4]
        n = r[5]
        return bytes(r[6:6 + n])

    def intercambiar(self, apdu):
        r = self._comando(0x40, b"\x01" + apdu, 500)
        if r is None or len(r) < 1 or r[0] != 0:
            return None
        return bytes(r[1:])

    def _autenticar(self, uid, bloque):
        orden = bytes([0x60, bloque]) + b"\xff" * 6 + uid[-4:]
        return self.intercambiar(orden) is not None

    def leer_texto(self, uid):
        datos = b""
        if self.sak in (0x08, 0x18):
            if not self._autenticar(uid, 4):
                return None
            ordenes = (4, 5)
        elif self.sak == 0x00:
            ordenes = (4, 8)
        else:
            return None
        for bloque in ordenes:
            r = self.intercambiar(bytes([0x30, bloque]))
            if r is None or len(r) < 16:
                return None
            datos += r[:16]
        try:
            return datos.split(b"\x00")[0].decode().strip()
        except UnicodeDecodeError:
            return ""

    def escribir_texto(self, uid, texto):
        datos = texto.encode()
        if len(datos) > LARGO_TEXTO:
            return False
        datos = datos.ljust(LARGO_TEXTO, b"\x00")
        if self.sak in (0x08, 0x18):
            if not self._autenticar(uid, 4):
                return False
            ordenes = [bytes([0xA0, 4 + i]) + datos[i * 16:(i + 1) * 16] for i in range(2)]
        elif self.sak == 0x00:
            ordenes = [bytes([0xA2, 4 + i]) + datos[i * 4:(i + 1) * 4] for i in range(8)]
        else:
            return False
        return all(self.intercambiar(o) is not None for o in ordenes)

    def liberar(self):
        self._comando(0x52, b"\x00", 200)


def hay_persona():
    return pir.value == 1


def iniciar_camara():
    global camara
    if Picamera2 is None:
        print("picamera2 no esta instalado; se continua sin camara.")
        return False
    try:
        os.makedirs(CARPETA_FOTOS, exist_ok=True)
        camara = Picamera2()
        config = camara.create_still_configuration(main={"size": (1280, 720)})
        camara.configure(config)
        camara.start()
        time.sleep(2)
        print("Camara lista")
        return True
    except Exception as e:
        print("No se pudo iniciar la camara:", e)
        camara = None
        return False


def fotos_de_sala():
    ruta = os.path.join(CARPETA_FOTOS, "sala.jpg")
    while True:
        try:
            camara.capture_file(ruta)
            nube.contar_personas(ruta)
        except Exception as e:
            print("Error en la foto de sala:", e)
        finally:
            if os.path.exists(ruta):
                os.remove(ruta)
        time.sleep(FOTO_SALA_S)


def sin_acentos(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def texto(s, x, y, escala=1):
    s = sin_acentos(s)
    if not s:
        return
    if escala == 1:
        draw.text((x, y), s, font=fuente, fill=1)
        return
    x0, y0, x1, y1 = draw.textbbox((0, 0), s, font=fuente)
    tmp = Image.new("1", (x1, y1), 0)
    ImageDraw.Draw(tmp).text((0, 0), s, font=fuente, fill=1)
    tmp = tmp.crop((x0, y0, x1, y1))
    tmp = tmp.resize((tmp.width * escala, tmp.height * escala), Image.NEAREST)
    img.paste(tmp, (x, y), tmp)


def ancho(s, escala):
    s = sin_acentos(s)
    x0, y0, x1, y1 = draw.textbbox((0, 0), s, font=fuente)
    return (x1 - x0) * escala


def limpiar():
    draw.rectangle((0, 0, 127, 63), fill=0)


def mostrar(l1, l2="", l3=""):
    limpiar()
    texto(l1, 0, 0, 2 if len(l1) <= 8 else 1)
    texto(l2, 0, 24)
    texto(l3, 0, 40)
    oled.display(img)


def pantalla_turno(n):
    s = str(n)
    escala = 5 if len(s) <= 3 else 3
    if ancho(s, escala) > 128:
        escala = 2
    limpiar()
    texto("TURNO", (128 - ancho("TURNO", 2)) // 2, 0, 2)
    texto(s, (128 - ancho(s, escala)) // 2, 22, escala)
    oled.display(img)


def pantalla_inicio():
    t = nube.siguiente_turno()
    if t is None:
        mostrar("Acerque su tag", "OK:%d Neg:%d" % (accesos_ok, accesos_denegados))
        return t
    limpiar()
    titulo = "PASE" if t["estado"] == "Llamado" else "SIGUE"
    texto("%s  OK:%d Neg:%d" % (titulo, accesos_ok, accesos_denegados), 0, 0)
    escala = 3 if ancho(t["codigo"], 3) <= 128 else 2
    texto(t["codigo"], max(0, (128 - ancho(t["codigo"], escala)) // 2), 14, escala)
    texto(t["paciente"], 0, 40)
    texto(t["consultorio"], 0, 52)
    oled.display(img)
    return t


def pitidos(veces, t):
    for _ in range(veces):
        buzzer.on()
        sleep_ms(t)
        buzzer.off()
        sleep_ms(t)


def acceso_concedido(quien, uid):
    global accesos_ok
    nube.registrar_acceso(uid, True, "Concedido")
    accesos_ok += 1
    print("ACCESO CONCEDIDO:", quien, "turno", accesos_ok)
    led_verde.on()
    turno = nube.turno_de(quien)
    pantalla_turno(turno["codigo"] if turno else accesos_ok)
    pitidos(1, 300)
    inicio = ms()
    while ms() - inicio < LED_VERDE_MS:
        if not hay_persona():
            mostrar("Persona se fue")
            sleep_ms(500)
            break
        sleep_ms(10)
    led_verde.off()


def acceso_denegado(motivo, extra, uid, presencia):
    global accesos_denegados
    nube.registrar_acceso(uid, presencia, "Denegado", motivo)
    accesos_denegados += 1
    print("ACCESO DENEGADO:", motivo, extra)
    led_rojo.on()
    mostrar("ACCESO DENEGADO", motivo, extra)
    pitidos(3, 150)
    sleep_ms(1000)
    led_rojo.off()


def esperar_presencia(quien, uid):
    mostrar("Tag leido", "Esperando PIR...")
    inicio = ms()
    while ms() - inicio < VENTANA_PIR_MS:
        if hay_persona():
            acceso_concedido(quien, uid)
            return
        sleep_ms(10)
    acceso_denegado("Sin presencia", quien, uid, False)


def identificar(nfc, uid):
    uid = uid[:7]
    clave = ""
    if nfc.sak & 0x20:
        resp = nfc.intercambiar(SELECT_APDU)
        if resp is not None and len(resp) >= 2 and resp[-2:] == b"\x90\x00":
            try:
                clave = resp[:-2][:LARGO_TEXTO].decode().strip()
            except UnicodeDecodeError:
                clave = ""
        print("Telefono, usuario:", clave)
    else:
        clave = nfc.leer_texto(uid) or ""
        print("Tarjeta, usuario:", clave)
    if not clave:
        uid_texto = ":".join("%02X" % b for b in uid)
        return False, uid_texto, "Sin usuario", uid_texto
    encontrado = nube.buscar_usuario(clave)
    if encontrado:
        if encontrado["rol"].casefold() in ROLES_CON_ORDEN:
            permitido, motivo = nube.es_su_turno(encontrado["nombre"])
            if not permitido:
                return False, encontrado["nombre"], motivo, clave
        return True, encontrado["nombre"], "", clave
    return False, clave, "Usuario no registrado", clave


def main():
    global oled, img, draw
    try:
        oled = ssd1306(luma_i2c(port=I2C_BUS_OLED, address=0x3C), width=128, height=64)
    except Exception as e:
        print("No se encuentra el OLED en 0x3C. Revisa cables y alimentacion.", e)
        return
    img = Image.new("1", (128, 64), 0)
    draw = ImageDraw.Draw(img)
    mostrar("Consultorio", "Inteligente")

    bus = SMBus(I2C_BUS_NFC)
    nfc = PN532(bus)
    if not nfc.iniciar():
        print("No se encuentra el PN532. Revisa cables, 3V3 e interruptores.")
        mostrar("PN532", "no responde")
        return

    if not nube.KEY:
        print("AVISO: falta DEVICE_KEY, los eventos no se enviaran")

    nube.iniciar_sincronizacion()
    print("Usuarios guardados en el Pi:", nube.total_usuarios())

    if iniciar_camara():
        threading.Thread(target=fotos_de_sala, daemon=True).start()

    for s in range(CALENTAMIENTO_S, 0, -1):
        mostrar("Calentando PIR", "%d s" % s)
        time.sleep(1)
    en_pantalla = pantalla_inicio()
    revisado = ms()
    print("Listo. Acerca telefono o tarjeta.")

    try:
        while True:
            try:
                uid = nfc.leer_objetivo()
                if uid is None:
                    if ms() - revisado >= 1000:
                        revisado = ms()
                        if nube.siguiente_turno() != en_pantalla:
                            en_pantalla = pantalla_inicio()
                    sleep_ms(50)
                    continue
                autorizado, quien, motivo, uid_envio = identificar(nfc, uid)
                nfc.liberar()
            except OSError as e:
                print("Error I2C:", e)
                sleep_ms(300)
                continue
            if autorizado:
                esperar_presencia(quien, uid_envio)
            else:
                acceso_denegado(motivo, quien, uid_envio, hay_persona())
            en_pantalla = pantalla_inicio()
            sleep_ms(1000)
    except KeyboardInterrupt:
        pass
    finally:
        led_verde.off()
        led_rojo.off()
        buzzer.off()
        if camara is not None:
            camara.stop()
        oled.clear()
        bus.close()


if __name__ == "__main__":
    main()
