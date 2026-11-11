# Alimentador Inteligente: firmware del ESP32-S3

Firmware del comedero para perro y gato. El ESP32-S3 reconoce con la cámara quién llegó al plato, le sirve su ración si le toca según sus horarios, pesa lo que comió y se lo reporta a la Raspberry Pi por MQTT. El contrato con la Pi está en [`../PROTOCOLO.md`](../PROTOCOLO.md) y se sigue al pie de la letra.

```
ESP32-S3 ── MQTT (1883) ──► Raspberry Pi (Mosquitto + gateway) ── HTTPS ──► Backend .NET
         └─ HTTP (8080) ──► /ota/<archivo>, /photos
```

## Hardware

| Pieza | Uso |
| --- | --- |
| ESP32-S3 con PSRAM octal y OV2640: **Freenove ESP32-S3 CAM** (N8R8, mismo mapeo de cámara que la ESP32-S3-EYE) o **Seeed XIAO ESP32S3 Sense** | Control, cámara y modelo |
| 2 servos de rotación continua (MG996R/FS5103R o similar), uno por tolva, moviendo un tornillo sinfín | Dispensar |
| 2 celdas de carga (1 a 5 kg) con módulo HX711 | Peso del plato del perro y del gato |
| 2 sensores ultrasónicos a 3.3 V (JSN-SR04T o HC-SR04P) en la tapa de cada tolva | Nivel de comida |
| Sensor PIR (HC-SR501 o AM312) apuntando a los platos | Detectar que llegó alguien |
| Lector RFID RDM6300 de 125 kHz (opcional) y llaveros EM4100 en el collar | Distinguir dos mascotas de la misma especie |
| Fuente de 5 V / 3 A | Los servos van directo a 5 V, no al pin de 3.3 V de la placa |

Tolva y plato 1 son del **perro** y 2 del **gato** (igual que el backend).

### Conexiones

Todas las señales son de 3.3 V. Si el ultrasónico es de 5 V (HC-SR04 normal), pon un divisor 1 kΩ / 2 kΩ en ECHO. Los pines se cambian solo en `include/config.h`.

| Señal | Freenove ESP32-S3 CAM (`esp32s3cam`) | XIAO ESP32S3 Sense (`xiao_s3`) |
| --- | --- | --- |
| Servo tolva perro (PWM) | GPIO1 | GPIO1 (D0) |
| Servo tolva gato (PWM) | GPIO2 | GPIO2 (D1) |
| HX711 perro DOUT / SCK | GPIO14 / GPIO21 | GPIO4 (D3) / GPIO3 (D2) |
| HX711 gato DOUT / SCK | GPIO47 / GPIO42 | GPIO5 (D4) / GPIO43 (D6) |
| Ultrasónicos TRIG (compartido) | GPIO41 | GPIO6 (D5) |
| ECHO tolva perro | GPIO40 | GPIO7 (D8) |
| ECHO tolva gato | GPIO39 | GPIO8 (D9) |
| PIR (salida) | GPIO38 | GPIO9 (D10) |
| RDM6300 TX → RX del ESP32 | GPIO3 | GPIO44 (D7) |
| LED de estado | (no) | GPIO21 (LED de la placa) |
| Cámara | interna (XCLK 15, SDA 4, SCL 5, D0-D7 11/9/8/10/12/18/17/16, VSYNC 6, HREF 7, PCLK 13) | interna (placa Sense) |

Notas:
- En la Freenove, GPIO38/39/40 son también del lector microSD (no se usa) y GPIO35-37 los ocupa la PSRAM.
- En la XIAO se usan los 11 pines; la microSD de la placa Sense comparte GPIO7/8/9 y no se puede usar. Si no conectas el RFID o el PIR, pon `USAR_RFID` / `USAR_PIR` en `false`.
- GND común entre la fuente de los servos, los HX711 y la placa.

## Estructura

```
esp32s3/
├── platformio.ini          entornos esp32s3cam, xiao_s3 y native (pruebas)
├── particiones_ota.csv     8 MB: app0 + app1 (3 MB c/u) + LittleFS (1.9 MB)
├── include/
│   ├── config.h            pines y constantes (único lugar a tocar para el hardware)
│   ├── secrets.example.h   plantilla de credenciales (copiar a secrets.h, ignorado por git)
│   ├── logica/*.h          lógica pura sin hardware (se prueba en la PC)
│   └── *.h                 módulos con hardware
├── src/
│   ├── logica/             protocolo JSON, raciones, cola offline, horarios, sensores, clasificador, consola
│   ├── main.cpp            setup/loop y publicación de status
│   ├── red_wifi.cpp        WiFi con reconexión
│   ├── enlace_mqtt.cpp     MQTT (LWT, suscripciones, cola con PUBACK)
│   ├── reloj.cpp           NTP + gateway/time + zona horaria
│   ├── almacenamiento.cpp  LittleFS con escritura atómica
│   ├── configuracion.cpp   config recibida y última comida por mascota
│   ├── calibracion.cpp     escalas, taras, flujos y distancias
│   ├── basculas.cpp        HX711
│   ├── nivel_tolva.cpp     ultrasónicos y HOPPER_LOW
│   ├── dispensador.cpp     servos, control por peso, atasco (JAM)
│   ├── vision.cpp          cámara, TFLite Micro, subida de fotos dudosas
│   ├── rfid.cpp            RDM6300
│   ├── visitas.cpp         ciclo de visita (reconocer → dispensar → pesar → publicar)
│   ├── comandos.cpp        cmd dispense / ota y cmd/result
│   ├── ota.cpp             OTA de firmware y de modelo con SHA-256 y rollback
│   └── consola_serie.cpp   comandos por el monitor serie
├── test/                   pruebas Unity de src/logica
└── scripts/pruebas_nativas.sh
```

## Primer flasheo

1. Instala PlatformIO (`pip install platformio` o la extensión de VS Code).
2. Copia las credenciales y llénalas:
   ```bash
   cp include/secrets.example.h include/secrets.h
   ```
   `FEEDER_ID` es el `Codigo` del alimentador en el backend; `MQTT_USER`/`MQTT_PASS` los da de alta la Pi en Mosquitto.
3. (Opcional) Para cargar el primer modelo sin OTA, crea `data/` con `model.tflite` y `model.ver` (texto con la versión, p. ej. `2026.11.1`) y sube el sistema de archivos:
   ```bash
   pio run -e esp32s3cam -t uploadfs
   ```
   `uploadfs` borra LittleFS completo (config, cola y calibración): hazlo solo la primera vez.
4. Compila y flashea por USB (en la XIAO usa `-e xiao_s3`). Si no entra en modo de descarga, deja presionado BOOT al conectar:
   ```bash
   pio run -e esp32s3cam -t upload
   pio device monitor
   ```
5. En el monitor escribe `ESTADO` para ver WiFi, MQTT, sensores y config.

Con el primer flasheo por USB no hay periodo de prueba de OTA; las siguientes versiones se instalan por aire.

## Calibración (monitor serie, 115200)

Los valores se guardan en `/calibracion.json` y sobreviven reinicios y OTA.

1. **Básculas**, con cada plato vacío y montado:
   ```
   TARA 1
   CALIBRAR_BASCULA 1 500      (con una pesa o algo de peso conocido, aquí 500 g, sobre el plato)
   TARA 2
   CALIBRAR_BASCULA 2 500
   ```
   Revisa con `ESTADO` que el plato marque el peso de la pesa.
2. **Flujo de cada tolva**, con croquetas en la tolva y el plato tarado:
   ```
   CALIBRAR_FLUJO 1 5          (gira 5 s y calcula g/s con lo que cayó)
   CALIBRAR_FLUJO 2 5
   ```
   Repite 2 o 3 veces; el flujo solo sirve para estimar el tiempo máximo, el corte real es por peso.
3. **Nivel de tolva**: con la tolva vacía `NIVEL_VACIO 1`; llena `NIVEL_LLENO 1` (igual para la 2).
4. Prueba: `DISPENSAR 1 30` debe dejar ~30 g en el plato del perro.

`FOTO` toma fotos y muestra la clase que da el modelo, útil para acomodar la cámara.

## Cómo funciona

- **Config**: llega retenida en `feeder/{id}/config` (mascotas, horarios, intervalo mínimo, zona horaria). Se valida completa; si algo está mal se conserva la anterior. Se guarda en LittleFS para funcionar sin la Pi.
- **Hora**: NTP contra la Pi y `pool.ntp.org`; si NTP no responde se usa `gateway/time`. Sin hora válida no se sirven horarios ni se publica status.
- **Horarios**: cada horario abre una comida para su mascota (o para todas si `petId` es null) durante `VENTANA_COMIDA_MIN` (3 h). La comida se sirve cuando la mascota llega al plato y nunca antes de `minIntervalHours` desde su comida anterior (también cuentan los dispensados manuales).
- **Visita**: el PIR, un RFID nuevo o un cambio de peso en un plato inicia la visita. Se toman 3 fotos y se promedian; con confianza menor a `UMBRAL_CONFIANZA` la foto se sube a la Pi (`POST /photos`). Perro/Gato se asocian a la mascota de esa especie (con varias de la misma especie decide el RFID o, si no hay, la única a la que le toca comer). Si le toca, se dispensa `gramsPerMeal` menos lo que ya hay en el plato. Nada nunca dispara el dispensador. Cuando deja de haber presencia 20 s se publica `visit` con el peso antes, lo dispensado y el peso después.
- **Atasco**: si durante el dispensado el plato no sube 1 g en 4 s, el servo gira en reversa 0.4 s y lo intenta otra vez; si sigue igual se detiene y publica `event` `JAM`.
- **Tolva baja**: debajo de 15 % se publica `HOPPER_LOW` una vez; se rearma al pasar de 25 %.
- **Status**: retenido cada 60 s y cuando cambia algo relevante (5 % de tolva, 10 g de plato, versión del modelo). LWT `{ "online": false }`.
- **Sin conexión**: visitas, eventos y resultados van a una cola en LittleFS (`/cola.txt`, 300 mensajes) y solo salen de ella cuando llega el PUBACK. Al reconectar o reiniciar se reenvían en orden; la Pi descarta duplicados por `eventId` / `id`. Las fotos dudosas no se guardan si la Pi no responde.
- **Comandos**: `dispense` usa `grams` o la ración de `petId`, y `hopper` o la tolva de la mascota. Se ejecutan uno a la vez; si esperan más de 2 min se contestan como vencidos (el backend ya los dio por vencidos).

## OTA

### Firmware

1. Sube `FIRMWARE_VERSION` en `include/config.h` (es lo que se reporta en `status`).
2. Compila y saca el SHA-256 del binario:
   ```bash
   pio run -e esp32s3cam
   sha256sum .pio/build/esp32s3cam/firmware.bin
   ```
3. Sube `firmware.bin` como artefacto `firmware` en el backend y lanza `POST /api/alimentadores/{id}/ota`. La Pi lo descarga, lo verifica y publica `cmd` con la URL de la LAN.
4. El ESP32 descarga a la partición OTA libre calculando el SHA-256 al vuelo. Si no coincide, aborta y contesta el error. Si coincide, marca la partición nueva y reinicia.
5. El firmware nuevo arranca "en prueba". Al conectarse a MQTT llama a `esp_ota_mark_app_valid_cancel_rollback()` y publica `cmd/result` con `ok: true`. Si en 60 s no se conecta, o se reinicia 3 veces seguidas, regresa al firmware anterior, que publica `ok: false` con `rollback` en el error.

### Modelo

El archivo se descarga a `/model.tmp`, se verifica el SHA-256, reemplaza a `/model.tflite`, se guarda la versión en `/model.ver` y se recarga sin reiniciar. Si el modelo nuevo no carga se restaura el anterior.

Requisitos del modelo:
- TFLite (de preferencia cuantizado a int8; también acepta uint8 o float32) con entrada `[1, alto, ancho, 3]` (o 1 canal) y **3 salidas en este orden: Perro, Gato, Nada**.
- Los pixeles 0-255 se llevan a `[MODELO_ENTRADA_MIN, MODELO_ENTRADA_MAX]` (0-1 por defecto; -1 a 1 para MobileNet) antes de cuantizar con la escala del tensor. Debe coincidir con el entrenamiento.
- La foto de 320x240 se recorta al centro en cuadrado y se escala al tamaño de entrada.
- Operaciones registradas: las de MobileNet/EfficientNet-Lite y CNN simples (ver `registrarOperaciones()` en `vision.cpp`). Arena de 1.5 MB en PSRAM.
- Debe caber en LittleFS junto con el modelo actual (~900 KB cada uno como máximo).

## Pruebas

La lógica sin hardware (`src/logica`) tiene pruebas Unity en `test/`:

```bash
pio test -e native
```

Si no tienes PlatformIO o no puede descargar herramientas, el script compila las mismas pruebas con `g++` (con AddressSanitizer y UBSan), descargando ArduinoJson y Unity de GitHub:

```bash
scripts/pruebas_nativas.sh            # todas
scripts/pruebas_nativas.sh planificador
```

Para probar contra la Pi sin hardware completo basta un broker:

```bash
mosquitto_sub -h <pi> -u <usuario> -P <clave> -t 'feeder/ALIM-001/#' -v
mosquitto_pub -h <pi> -u <usuario> -P <clave> -t feeder/ALIM-001/cmd -q 1 \
  -m '{"id":15,"type":"dispense","grams":30.0,"petId":null,"hopper":1}'
```

## Limitaciones conocidas

- Una visita a la vez: si perro y gato comen al mismo tiempo se registra como una sola visita del que reconozca la cámara.
- Sin báscula funcionando no se dispensa (no habría forma de controlar la ración ni detectar atascos).
- Las fotos dudosas que no se pudieron subir no se reintentan.
- Si el ESP32 arranca sin red y sin hora, las visitas de ese periodo salen con tiempo 0 hasta que haya NTP o `gateway/time`.
