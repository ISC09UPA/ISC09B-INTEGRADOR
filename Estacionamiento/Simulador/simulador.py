import os
import json
import uuid
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient
from azure.servicebus import ServiceBusClient, ServiceBusMessage, TransportType

BLOB_CONN = os.environ["BLOB_CONN"]
BUS_CONN = os.environ["BUS_CONN"]

COLA_EVENTOS = "eventos-maqueta"
COLA_COMANDOS = "comandos-maqueta"
CONTENEDOR = "fotos-placas"
TOTAL = 4
ESPERA_RESPUESTA = 15  # segundos

cajones = {i: "libre" for i in range(1, TOTAL + 1)}
blob_service = BlobServiceClient.from_connection_string(BLOB_CONN)
bus = ServiceBusClient.from_connection_string(
    BUS_CONN, transport_type=TransportType.AmqpOverWebsocket
)


def ahora():
    return datetime.now(timezone.utc).isoformat()


def libres():
    return sum(1 for e in cajones.values() if e == "libre")


def mostrar():
    for n, e in cajones.items():
        print("  Cajon", n, "->", "[ROJO] ocupado" if e == "ocupado" else "[VERDE] libre")
    print("  Libres:", libres(), "de", TOTAL)


def enviar(sender, datos):
    sender.send_messages(
        ServiceBusMessage(json.dumps(datos), content_type="application/json")
    )


def cambiar_cajon(sender, numero, estado):
    if numero not in cajones:
        print("Cajon invalido (1 a", str(TOTAL) + ")")
        return
    if cajones[numero] == estado:
        print("El cajon", numero, "ya estaba", estado)
        return
    cajones[numero] = estado
    enviar(sender, {"tipo": "cajon", "cajon": numero, "estado": estado, "ts": ahora()})
    print("Evento enviado: cajon", numero, estado)
    mostrar()


def subir_foto(evento_id, ruta):
    nombre = datetime.now(timezone.utc).strftime("%Y-%m-%d") + "/" + evento_id + ".jpg"
    if ruta and os.path.exists(ruta):
        with open(ruta, "rb") as f:
            datos = f.read()
    else:
        print("(sin foto real: se sube un archivo de relleno)")
        datos = b"foto-simulada"
    blob_service.get_blob_client(CONTENEDOR, nombre).upload_blob(datos, overwrite=True)
    return nombre


def auto_en_pluma(sender, ruta):
    evento_id = uuid.uuid4().hex[:8]
    nombre = subir_foto(evento_id, ruta)
    enviar(sender, {"tipo": "vehiculo_en_pluma", "evento_id": evento_id,
                    "foto": nombre, "ts": ahora()})
    print("Auto en pluma enviado (evento", evento_id + "). Esperando respuesta...")
    with bus.get_queue_receiver(COLA_COMANDOS, max_wait_time=ESPERA_RESPUESTA) as rx:
        for msg in rx.receive_messages(max_message_count=5):
            cmd = json.loads(str(msg))
            rx.complete_message(msg)
            if cmd.get("evento_id") != evento_id:
                print("  (comando viejo descartado:", cmd.get("evento_id"), ")")
                continue
            if cmd.get("accion") == "abrir" and (cmd.get("tipo") == "salida" or libres() > 0):
                print("  >>> PLUMA SUBE (" + str(cmd.get("tipo")) + ")")
            else:
                print("  >>> PLUMA CERRADA (" + str(cmd.get("motivo")) + ")")
            return
    print("  Sin respuesta de Azure (aun no hay backend, o tardo demasiado).")


AYUDA = """Comandos:
  o N          ocupar el cajon N
  l N          liberar el cajon N
  p [foto.jpg] llega un auto a la pluma (foto opcional)
  e            ver estado
  s            salir"""

print(AYUDA)
mostrar()
with bus:
    with bus.get_queue_sender(COLA_EVENTOS) as sender:
        while True:
            partes = input("> ").strip().split()
            if not partes:
                continue
            c = partes[0].lower()
            if c == "o" and len(partes) == 2 and partes[1].isdigit():
                cambiar_cajon(sender, int(partes[1]), "ocupado")
            elif c == "l" and len(partes) == 2 and partes[1].isdigit():
                cambiar_cajon(sender, int(partes[1]), "libre")
            elif c == "p":
                auto_en_pluma(sender, partes[1] if len(partes) > 1 else None)
            elif c == "e":
                mostrar()
            elif c == "s":
                break
            else:
                print(AYUDA)