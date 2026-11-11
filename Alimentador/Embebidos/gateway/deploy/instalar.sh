#!/usr/bin/env bash
# Instala el gateway del Alimentador Inteligente en Raspberry Pi OS (Bookworm).
# Uso:  sudo ./deploy/instalar.sh            (desde Alimentador/Embebidos/gateway)
# Se puede volver a correr para actualizar: no toca config.toml ni las contraseñas.
set -euo pipefail

DIR_FUENTE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO=/opt/alimentador-gateway
CONFIG_DIR=/etc/alimentador
CONFIG=$CONFIG_DIR/config.toml
DATOS=/var/lib/alimentador
USUARIO=alimentador
PASSWD=/etc/mosquitto/alimentador.passwd
ACL=/etc/mosquitto/alimentador.acl

if [[ $EUID -ne 0 ]]; then
    echo "Corre este script con sudo." >&2
    exit 1
fi

echo "==> Paquetes del sistema"
apt-get update -q
apt-get install -y -q python3 python3-venv python3-pip mosquitto mosquitto-clients sqlite3 curl

PY_OK=$(python3 -c 'import sys; print(int(sys.version_info >= (3, 11)))')
if [[ $PY_OK != 1 ]]; then
    echo "Se necesita Python 3.11 o superior (Bookworm trae 3.11)." >&2
    exit 1
fi

echo "==> Usuario de servicio '$USUARIO'"
if ! id "$USUARIO" &>/dev/null; then
    useradd --system --home-dir "$DATOS" --no-create-home --shell /usr/sbin/nologin "$USUARIO"
fi

echo "==> Directorios"
install -d -o "$USUARIO" -g "$USUARIO" -m 0750 "$DATOS" "$DATOS/ota" "$DATOS/fotos"
install -d -o root -g "$USUARIO" -m 0750 "$CONFIG_DIR"
install -d -m 0755 "$DESTINO"

echo "==> Código en $DESTINO"
rm -rf "$DESTINO/src"
install -d -m 0755 "$DESTINO/src"
cp -r "$DIR_FUENTE/alimentador_gateway" "$DIR_FUENTE/pyproject.toml" "$DIR_FUENTE/README.md" "$DESTINO/src/"
find "$DESTINO/src" -name '__pycache__' -prune -exec rm -rf {} +
cp "$DIR_FUENTE/README.md" "$DESTINO/README.md"

echo "==> Entorno virtual"
if [[ ! -x $DESTINO/venv/bin/python ]]; then
    python3 -m venv "$DESTINO/venv"
fi
"$DESTINO/venv/bin/pip" install -q --upgrade pip
"$DESTINO/venv/bin/pip" install -q "$DESTINO/src"

echo "==> Mosquitto"
install -m 0644 "$DIR_FUENTE/deploy/mosquitto.conf" /etc/mosquitto/conf.d/alimentador.conf
install -o mosquitto -g mosquitto -m 0640 "$DIR_FUENTE/deploy/mosquitto.acl" "$ACL"
CLAVE_MQTT=""
if [[ ! -f $PASSWD ]] || ! grep -q '^gateway:' "$PASSWD"; then
    CLAVE_MQTT=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)
    [[ -f $PASSWD ]] || install -o mosquitto -g mosquitto -m 0640 /dev/null "$PASSWD"
    mosquitto_passwd -b "$PASSWD" gateway "$CLAVE_MQTT"
fi
chown mosquitto:mosquitto "$PASSWD"
chmod 0640 "$PASSWD"

echo "==> Configuración"
if [[ ! -f $CONFIG ]]; then
    install -o root -g "$USUARIO" -m 0640 "$DIR_FUENTE/config.example.toml" "$CONFIG"
    echo "    Se creó $CONFIG; llena [backend] url, device_id y device_key."
fi
if [[ -n $CLAVE_MQTT ]]; then
    # Escribe la contraseña MQTT del gateway en la sección [mqtt]
    sed -i "/^\[mqtt\]/,/^\[/ s|^password = .*|password = \"$CLAVE_MQTT\"|" "$CONFIG"
    echo "    Usuario MQTT 'gateway' creado; su contraseña ya está en $CONFIG."
fi
chown root:"$USUARIO" "$CONFIG"
chmod 0640 "$CONFIG"

install -m 0755 "$DIR_FUENTE/deploy/agregar-esp32.sh" /usr/local/sbin/alimentador-agregar-esp32

systemctl enable mosquitto
systemctl restart mosquitto

echo "==> Servicio systemd"
install -m 0644 "$DIR_FUENTE/deploy/alimentador-gateway.service" /etc/systemd/system/alimentador-gateway.service
systemctl daemon-reload
systemctl enable alimentador-gateway

if "$DESTINO/venv/bin/alimentador-gateway" --config "$CONFIG" --check; then
    systemctl restart alimentador-gateway
    echo "==> Listo. Revisa:  journalctl -u alimentador-gateway -f"
else
    echo "==> Falta completar $CONFIG. Después:  sudo systemctl restart alimentador-gateway"
fi
