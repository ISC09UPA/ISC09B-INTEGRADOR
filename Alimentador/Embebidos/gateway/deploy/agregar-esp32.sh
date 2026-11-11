#!/usr/bin/env bash
# Da de alta (o cambia la contraseña de) un ESP32 en Mosquitto.
# El usuario MQTT es el Codigo del alimentador en el backend (FeederId).
# Uso:  sudo alimentador-agregar-esp32 feeder01            (genera contraseña)
#       sudo alimentador-agregar-esp32 feeder01 <clave>
#       sudo alimentador-agregar-esp32 --borrar feeder01
set -euo pipefail

PASSWD=/etc/mosquitto/alimentador.passwd

if [[ $EUID -ne 0 ]]; then
    echo "Corre este script con sudo." >&2
    exit 1
fi

if [[ ${1:-} == "--borrar" ]]; then
    CODIGO=${2:?Falta el Codigo del alimentador}
    mosquitto_passwd -D "$PASSWD" "$CODIGO"
    systemctl reload mosquitto
    echo "Usuario MQTT '$CODIGO' eliminado."
    exit 0
fi

CODIGO=${1:?Uso: $0 <Codigo del alimentador> [contraseña]}
if [[ ! $CODIGO =~ ^[A-Za-z0-9_-]{1,64}$ ]]; then
    echo "El Codigo solo puede tener letras, números, '-' y '_'." >&2
    exit 1
fi
if [[ $CODIGO == "gateway" ]]; then
    echo "'gateway' está reservado para el servicio de la Pi." >&2
    exit 1
fi

CLAVE=${2:-$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)}
mosquitto_passwd -b "$PASSWD" "$CODIGO" "$CLAVE"
chown mosquitto:mosquitto "$PASSWD"
chmod 0640 "$PASSWD"
systemctl reload mosquitto

IP=$(hostname -I | awk '{print $1}')
cat <<EOF
ESP32 '$CODIGO' dado de alta. Datos para su configuración:
  MQTT host:     $IP
  MQTT puerto:   1883
  MQTT usuario:  $CODIGO
  MQTT clave:    $CLAVE
  Temas:         feeder/$CODIGO/#   (y lectura de gateway/time)
  HTTP gateway:  http://$IP:8080
EOF
