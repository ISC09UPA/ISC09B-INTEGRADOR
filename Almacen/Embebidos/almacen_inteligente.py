import json
from time import sleep
from gpiozero import Button, LED

NUM = 6

SENSORES = (2, 3, 4, 5, 6, 7)
LEDS_VERDES = (8, 9, 10, 11, 12, 13)
LEDS_ROJOS = (16, 17, 18, 19, 20, 21)


def main():
    # Un sensor conectado a GND se interpreta como ocupado.
    sensores = [Button(pin, pull_up=True) for pin in SENSORES]
    verdes = [LED(pin) for pin in LEDS_VERDES]
    rojos = [LED(pin) for pin in LEDS_ROJOS]
    estado_anterior = [-1] * NUM

    try:
        while True:
            cambio = False
            for i in range(NUM):
                ocupado = int(sensores[i].is_pressed)
                if ocupado:
                    verdes[i].on()
                    rojos[i].off()
                else:
                    verdes[i].off()
                    rojos[i].on()

                if ocupado != estado_anterior[i]:
                    estado_anterior[i] = ocupado
                    cambio = True

            if cambio:
                print(json.dumps({
                    "slots": estado_anterior,
                    "ocupados": sum(estado_anterior),
                }, separators=(",", ":")), flush=True)

            sleep(0.05)
    except KeyboardInterrupt:
        pass
    finally:
        for dispositivo in (*sensores, *verdes, *rojos):
            dispositivo.close()


if __name__ == "__main__":
    main()
