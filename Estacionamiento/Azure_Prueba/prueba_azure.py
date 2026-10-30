import os
from azure.storage.blob import BlobServiceClient
from azure.servicebus import ServiceBusClient, ServiceBusMessage, TransportType

BLOB_CONN = os.environ["BLOB_CONN"]
BUS_CONN = os.environ["BUS_CONN"]

blob_service = BlobServiceClient.from_connection_string(BLOB_CONN)
blob = blob_service.get_blob_client("fotos-placas", "prueba.txt")
blob.upload_blob(b"hola desde python", overwrite=True)
print("Blob OK: prueba.txt subido")

with ServiceBusClient.from_connection_string(
    BUS_CONN, transport_type=TransportType.AmqpOverWebsocket
) as cliente:
    with cliente.get_queue_sender("eventos-maqueta") as sender:
        sender.send_messages(ServiceBusMessage('{"cajon":1,"estado":"ocupado"}'))
        print("Service Bus: mensaje enviado")

    with cliente.get_queue_receiver("eventos-maqueta", max_wait_time=5) as receiver:
        for msg in receiver.receive_messages(max_message_count=5):
            print("Service Bus recibido:", str(msg))
            receiver.complete_message(msg)
