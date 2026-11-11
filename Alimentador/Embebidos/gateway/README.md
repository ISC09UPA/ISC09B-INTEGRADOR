# Gateway Raspberry Pi — Alimentador Inteligente

Servicio en Python 3.11+ (asyncio) que corre en la Raspberry Pi y hace de puente entre los
ESP32-S3 de los comederos (perro y gato) y el backend .NET. El contrato completo está en
`Alimentador/Embebidos/PROTOCOLO.md`.

```
ESP32-S3 ──MQTT (Mosquitto en la Pi, 1883)──► gateway ──HTTPS /api/device/*──► Backend
         ◄──HTTP LAN :8080 (OTA, fotos)─────►  cola SQLite        (X-Device-Id / X-Device-Key)
```

## Qué hace

| Función | Detalle |
| --- | --- |
| MQTT | Se suscribe a `feeder/+/status`, `feeder/+/visit`, `feeder/+/event`, `feeder/+/cmd/result`. Publica `feeder/{id}/config` (retained), `feeder/{id}/cmd` y `gateway/time` (retained, cada 60 s). |
| Internet | `GET /health` cada 15 s. Al perderlo guarda `offlineSince`; al volver manda un heartbeat con `offlineSince`, vacía la cola en orden y termina con `POST sync-complete`. |
| Heartbeat | Cada 60 s (y al cambiar `online` de un ESP32) con el último `status` de cada alimentador. Con el `serverTime` de la respuesta corrige el reloj de la Pi (no tiene RTC). |
| Cola offline | SQLite en `/var/lib/alimentador/gateway.db`. Visitas, eventos, resultados de comandos y fotos pasan por ahí; se envían en orden (lotes de hasta 50 visitas/eventos consecutivos), con reintentos y backoff exponencial (2 s … 5 min). El backend descarta duplicados por `eventId`. Lo que el backend rechaza de forma definitiva (400/404/409) se mueve a la tabla `descartados` para no bloquear la cola. |
| Config | Poll de `GET config?version=N` cada 30 s (204 = sin cambios) y una consulta completa (`version=0`) cada 10 min. Publica en `feeder/{id}/config` solo lo que cambió; si un alimentador se desliga, borra su retained. Al reconectar a MQTT vuelve a publicar todo. |
| Comandos | Poll de `GET commands` cada 5 s. Cada comando se guarda en SQLite antes de ejecutarse (el backend ya lo marcó como entregado) y se reanuda si la Pi se reinicia. |
| `dispense` | Publica `feeder/{id}/cmd` y espera `cmd/result` (90 s). Si el comando tiene más de 2 min sin publicarse responde `expired` (el backend lo marca como vencido). |
| `ota` | Descarga el artefacto desde la URL SAS, verifica el SHA-256, lo guarda en `/var/lib/alimentador/ota/`, publica `cmd` con `http://<ip-pi>:8080/ota/<archivo>` y espera `cmd/result` (15 min). |
| HTTP LAN | `GET /ota/<archivo>`, `POST /photos?feederId=&eventId=&class=&confidence=&takenAt=` (body `image/jpeg`, responde `202`; la Pi pide la SAS, sube con `x-ms-blob-type: BlockBlob` y confirma), `GET /health`. |

### Errores que la Pi reporta en `commands/{id}/result`

| `error` | Cuándo |
| --- | --- |
| `expired` | Dispensado con más de 2 min desde que llegó (p. ej. tras un reinicio). |
| `feeder_offline` | El último `status` del ESP32 dice `online: false` (LWT). |
| `mqtt_unavailable` | No se pudo publicar en el broker a tiempo. |
| `timeout` | El ESP32 no publicó `cmd/result` a tiempo. |
| `sha256_mismatch` / `download_failed` | El artefacto OTA no coincide o no se pudo descargar (3 intentos). |
| `invalid_command` / `gateway_error` | Comando mal formado o error interno. |

Cualquier otro `error` viene tal cual del ESP32.

## Estructura

```
gateway/
├── alimentador_gateway/
│   ├── __main__.py   arranque (python -m alimentador_gateway -c config.toml [--check])
│   ├── app.py        ensambla todo y despacha los mensajes MQTT
│   ├── config.py     lectura y validación de config.toml
│   ├── mqtt.py       cliente aiomqtt con reconexión (sesión persistente)
│   ├── backend.py    cliente httpx de /api/device y de Blob Storage (SAS)
│   ├── sync.py       conectividad, heartbeat, cola, sync-complete, config y poll de comandos
│   ├── store.py      SQLite: cola, descartados, estado, status, configs, comandos
│   ├── mapping.py    payload MQTT <-> DTOs (funciones puras)
│   ├── commands.py   dispense y ota contra los ESP32
│   ├── ota.py        descarga, SHA-256 y archivos servidos en la LAN
│   ├── lan.py        servidor aiohttp :8080
│   └── util.py       reloj, backoff, IP de la LAN
├── tests/            pytest con backend, Blob Storage y broker falsos
├── deploy/
│   ├── alimentador-gateway.service   unidad systemd
│   ├── mosquitto.conf                sin anónimos, archivo de contraseñas y ACL
│   ├── mosquitto.acl                 cada ESP32 solo en feeder/<su usuario>/#
│   ├── instalar.sh                   instalador para Raspberry Pi OS Bookworm
│   └── agregar-esp32.sh              alta de un ESP32 en Mosquitto
├── config.example.toml
├── pyproject.toml
└── requirements.txt
```

## Instalación en la Raspberry Pi

Probado para Raspberry Pi OS Bookworm (Python 3.11, Mosquitto 2.0).

1. **Preparar la Pi.** Flashea Raspberry Pi OS Lite (64 bits) con Raspberry Pi Imager, activa SSH y
   conéctala a la misma red que los comederos. Conviene reservarle una IP fija en el router
   (los ESP32 la usan para MQTT y para OTA).

2. **Copiar el código.**
   ```bash
   sudo apt install -y git
   git clone <url-del-repo> ~/ISC09B-INTEGRADOR
   cd ~/ISC09B-INTEGRADOR/Alimentador/Embebidos/gateway
   ```

3. **Dar de alta el gateway en el backend** (sección siguiente) para tener `deviceId` y la clave.

4. **Instalar.**
   ```bash
   sudo ./deploy/instalar.sh
   ```
   El script instala `python3-venv`, `mosquitto`, `mosquitto-clients` y `sqlite3`; crea el usuario
   de servicio `alimentador`; copia el código a `/opt/alimentador-gateway` con su venv; instala la
   configuración de Mosquitto (`/etc/mosquitto/conf.d/alimentador.conf`, ACL y archivo de
   contraseñas); crea el usuario MQTT `gateway` con contraseña aleatoria; copia
   `config.example.toml` a `/etc/alimentador/config.toml` (solo si no existe) y habilita
   `alimentador-gateway.service`. Se puede volver a correr para actualizar: no toca la
   configuración ni las contraseñas existentes.

5. **Configurar.**
   ```bash
   sudo nano /etc/alimentador/config.toml
   ```
   Llena `[backend] url`, `device_id` y `device_key`. La contraseña de `[mqtt]` ya la puso el
   instalador. Si la Pi tiene varias interfaces, pon su IP de la LAN en `[lan] public_host`.
   Este archivo tiene la clave del dispositivo: queda con permisos `640 root:alimentador` y
   **nunca** se sube a git (`config.toml` está en `.gitignore`).

6. **Arrancar y verificar.**
   ```bash
   sudo -u alimentador /opt/alimentador-gateway/venv/bin/alimentador-gateway -c /etc/alimentador/config.toml --check
   sudo systemctl restart alimentador-gateway
   journalctl -u alimentador-gateway -f
   curl -s http://localhost:8080/health
   ```
   En el log debe aparecer `Conexión con el backend restablecida` y `Conectado a MQTT`.

## Dar de alta el gateway en el backend

Se hace una sola vez por Pi, con la cuenta del dueño (token de `POST /api/auth/login`):

```bash
curl -s -X POST https://<backend>/api/gateways \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{ "deviceId": "pi-casa" }'
# -> { "id": 1, "deviceId": "pi-casa", "clave": "Xb3...==" }
```

- `deviceId` va en `[backend] device_id` y `clave` en `[backend] device_key`.
- **La clave solo se muestra en esta respuesta** (el backend guarda su hash SHA-256). Si se pierde:
  `POST /api/gateways/{id}/regenerar-clave` devuelve una nueva y la anterior deja de funcionar.

Después se liga el alimentador al gateway (solo quien registró la Pi puede hacerlo):

```bash
# Alimentador nuevo: Codigo = FeederId = usuario MQTT del ESP32
curl -s -X POST https://<backend>/api/alimentadores \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{ "codigo": "feeder01", "nombre": "Cocina", "kcalPorGramo": 3.6,
        "gatewayDeviceId": "pi-casa", "zonaHoraria": "America/Mexico_City" }'

# Alimentador existente: PUT /api/alimentadores/{id} con "gatewayDeviceId": "pi-casa"
```

En menos de 10 min (o al reiniciar el servicio) la Pi recibe la config y la publica retained en
`feeder/feeder01/config`.

## Agregar un ESP32

1. El alimentador debe existir en el backend y estar ligado a este gateway (arriba). Su `Codigo`
   (letras, números, `-`, `_`) es el `{id}` de todos los temas.
2. Crear su usuario MQTT con el mismo nombre que el `Codigo`:
   ```bash
   sudo alimentador-agregar-esp32 feeder01          # genera la contraseña y la imprime
   ```
   (equivale a `mosquitto_passwd -b /etc/mosquitto/alimentador.passwd feeder01 <clave>` +
   `systemctl reload mosquitto`). Para darlo de baja: `sudo alimentador-agregar-esp32 --borrar feeder01`.
3. Configurar el firmware del ESP32 con: host MQTT = IP de la Pi, puerto 1883, usuario `feeder01`,
   la contraseña generada, y `http://<ip-pi>:8080` para OTA y fotos.
4. La ACL solo le permite `feeder/feeder01/#` y leer `gateway/time`. Si publica en el árbol de
   otro alimentador, Mosquitto lo descarta (`Denied PUBLISH` en `journalctl -u mosquitto`).
5. Verificar que llegue su estado:
   ```bash
   mosquitto_sub -h localhost -u gateway -P '<clave mqtt del gateway>' -t 'feeder/feeder01/#' -v
   ```

## OTA: nombre de los artefactos

`GET /api/device/commands` entrega `url` (SAS) y `sha256`, pero no el tipo ni la versión del
artefacto que lleva el `cmd` MQTT (`target`, `version`). La Pi los deduce del nombre del blob en el
contenedor `ota`, así que al subir artefactos usa esta convención:

```
ota/firmware/<version>/<archivo>.bin      ej. ota/firmware/1.3.0/feeder.bin
ota/model/<version>/<archivo>.tflite      ej. ota/model/2026.11.1/model.tflite
```

Cualquier ruta que contenga `model`/`modelo` o termine en `.tflite`/`.onnx`/`.espdl` se trata como
modelo; lo demás como firmware. La versión es el último `x.y[.z]` de la ruta. Si el backend algún
día agrega `target`/`version` a `ComandoDispositivoDto`, la Pi los usa directamente.

La Pi conserva los últimos 6 artefactos en `/var/lib/alimentador/ota/` con nombre
`<12 primeros del sha256>-<archivo>`.

## Diagnóstico

```bash
systemctl status alimentador-gateway mosquitto
journalctl -u alimentador-gateway -n 200 --no-pager
curl -s http://localhost:8080/health | python3 -m json.tool
```

`/health` muestra `backendOnline`, `mqttConnected`, `queue` (pendientes), `discarded`,
`offlineSince` y `lastError`.

Cola y comandos:

```bash
sudo sqlite3 /var/lib/alimentador/gateway.db \
  "SELECT id, tipo, intentos, ultimo_error FROM cola ORDER BY id LIMIT 20;"
sudo sqlite3 /var/lib/alimentador/gateway.db "SELECT id, tipo, motivo FROM descartados;"
sudo sqlite3 /var/lib/alimentador/gateway.db "SELECT id, feeder_id, tipo, estado FROM comandos ORDER BY id DESC LIMIT 10;"
sudo sqlite3 /var/lib/alimentador/gateway.db "SELECT * FROM estado;"
```

Tráfico MQTT:

```bash
mosquitto_sub -h localhost -u gateway -P '<clave>' -t 'feeder/#' -t 'gateway/#' -v
```

| Síntoma | Causa probable |
| --- | --- |
| `El backend rechazó X-Device-Id/X-Device-Key` | `device_id`/`device_key` mal copiados o se regeneró la clave. |
| `--check` dice `faltan device_id / device_key` | `config.toml` todavía tiene los valores de ejemplo. |
| `MQTT desconectado (... not authorised)` | Contraseña de `[mqtt]` distinta a la de `alimentador.passwd`. Regenerar: `sudo mosquitto_passwd -b /etc/mosquitto/alimentador.passwd gateway <nueva>` y ponerla en `config.toml`. |
| El ESP32 no conecta | Usuario distinto al `Codigo`, contraseña equivocada o `allow_anonymous false` (no hay acceso anónimo). Ver `journalctl -u mosquitto`. |
| `Payload inválido en feeder/...` | El ESP32 manda un campo con otro nombre/tipo, o tiempos sin sincronizar (antes de 2023). Revisa `PROTOCOLO.md`. |
| `queue` crece con internet | Ver `ultimo_error` en la tabla `cola`; con 5xx/timeout se reintenta solo. |
| La config no llega a un ESP32 nuevo | Que esté ligado al gateway en el backend; esperar la consulta completa (10 min) o `sudo systemctl restart alimentador-gateway`. |
| El ESP32 no descarga la OTA | `public_host` incorrecto (la URL publicada en `cmd` debe ser alcanzable desde la LAN) o el puerto 8080 bloqueado. |
| Hora incorrecta | La Pi no tiene RTC; se corrige con el `serverTime` del heartbeat. Revisa `timedatectl`. |

## Desarrollo

```bash
cd Alimentador/Embebidos/gateway
pip install -r requirements.txt pytest pytest-asyncio
pytest
# Correr contra un backend local
cp config.example.toml config.toml   # url = "http://localhost:5126", rutas en un directorio propio
python -m alimentador_gateway -c config.toml
```
