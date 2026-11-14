#pragma once

// Pines y constantes del alimentador. Todo lo que dependa del hardware se ajusta aquí.
// Las credenciales van en secrets.h (copiar secrets.example.h).

#include <stdint.h>

#define FIRMWARE_VERSION "1.0.0"

// ---------------------------------------------------------------------------
// Pines de la PCB del alimentador (ESP32-S3 N16R8 CAM con OV3660)
// ---------------------------------------------------------------------------
// GPIO35-37 los ocupa la PSRAM octal, 19/20 el USB, 43/44 el monitor serie y 4-13, 15-18 la
// cámara. Lo que no cabe en la ESP32 (EN/DIR de los TMC2209, XSHUT de los ToF, buzzer y botón)
// va por el expansor MCP23017 del conector J2.
#if !defined(PLACA_ESP32S3_CAM)
#error "Define PLACA_ESP32S3_CAM en platformio.ini"
#endif

// Motores NEMA17 con TMC2209 en modo STEP/DIR (J7/J9). STEP sale de la ESP32 con LEDC.
constexpr int PIN_STEP_PERRO = 1;   // J23.3 -> STEP1
constexpr int PIN_STEP_GATO = 2;    // J23.4 -> STEP2

// Básculas HX711 de los platos (J16 perro, J17 gato)
constexpr int PIN_HX711_PERRO_DOUT = 38;
constexpr int PIN_HX711_PERRO_SCK = 14;
constexpr int PIN_HX711_GATO_DOUT = 39;
constexpr int PIN_HX711_GATO_SCK = 42;

// Bus I2C compartido: MCP23017, DS3231 y los tres VL53L0X
constexpr int PIN_I2C_SDA = 21;
constexpr int PIN_I2C_SCL = 47;
constexpr uint32_t I2C_FRECUENCIA_HZ = 400000;

constexpr int PIN_RFID_RX = 41;     // RDM6300 a través del divisor R1/R2 (5 V -> 3.3 V)
constexpr int PIN_LED_RGB = 48;     // WS2812 de J4

// Expansor MCP23017 (A0-A2 a GND) y bits de su puerto A, en el orden de J2 pines 5-12
constexpr uint8_t MCP23017_DIRECCION = 0x20;
constexpr uint8_t MCP_EN1 = 0;      // TMC2209 tolva perro, activo en bajo
constexpr uint8_t MCP_DIR1 = 1;
constexpr uint8_t MCP_EN2 = 2;      // TMC2209 tolva gato, activo en bajo
constexpr uint8_t MCP_DIR2 = 3;
constexpr uint8_t MCP_XSHUT1 = 4;   // VL53L0X nivel tolva perro (J20)
constexpr uint8_t MCP_XSHUT2 = 5;   // VL53L0X nivel tolva gato (J21)
constexpr uint8_t MCP_BUZZER = 6;   // base de Q1 a través de R3
constexpr uint8_t MCP_BOTON = 7;    // a GND al presionar, pull-up interno

// Direcciones I2C. Los VL53L0X arrancan en 0x29; al iniciar se les asigna una a cada uno.
constexpr uint8_t DS3231_DIRECCION = 0x68;
constexpr uint8_t TOF_DIRECCION_FABRICA = 0x29;
constexpr uint8_t TOF_DIRECCION_PRESENCIA = 0x30;
constexpr uint8_t TOF_DIRECCION_NIVEL1 = 0x31;
constexpr uint8_t TOF_DIRECCION_NIVEL2 = 0x32;

constexpr int CAM_PIN_PWDN = -1;
constexpr int CAM_PIN_RESET = -1;
constexpr int CAM_PIN_XCLK = 15;
constexpr int CAM_PIN_SIOD = 4;
constexpr int CAM_PIN_SIOC = 5;
constexpr int CAM_PIN_D7 = 16;
constexpr int CAM_PIN_D6 = 17;
constexpr int CAM_PIN_D5 = 18;
constexpr int CAM_PIN_D4 = 12;
constexpr int CAM_PIN_D3 = 10;
constexpr int CAM_PIN_D2 = 8;
constexpr int CAM_PIN_D1 = 9;
constexpr int CAM_PIN_D0 = 11;
constexpr int CAM_PIN_VSYNC = 6;
constexpr int CAM_PIN_HREF = 7;
constexpr int CAM_PIN_PCLK = 13;

// Módulos opcionales: poner en false si no está conectado.
constexpr bool USAR_RFID = true;

// ---------------------------------------------------------------------------
// Red, MQTT y HTTP
// ---------------------------------------------------------------------------
constexpr uint32_t WIFI_REINTENTO_MIN_MS = 5000;
constexpr uint32_t WIFI_REINTENTO_MAX_MS = 60000;
constexpr uint32_t MQTT_REINTENTO_MIN_MS = 2000;
constexpr uint32_t MQTT_REINTENTO_MAX_MS = 30000;
constexpr uint16_t MQTT_KEEPALIVE_S = 30;
constexpr uint32_t ESTADO_PERIODO_MS = 60000;   // status cada 60 s (protocolo)
constexpr size_t COLA_SALIDA_CAPACIDAD = 300;   // visitas/eventos/resultados sin enviar
constexpr size_t COLA_MAX_EN_VUELO = 5;         // publicaciones QoS 1 sin PUBACK
constexpr uint32_t HTTP_TIMEOUT_MS = 15000;
constexpr const char* NTP_SERVIDOR_RESPALDO = "pool.ntp.org";

// ---------------------------------------------------------------------------
// Básculas (HX711) y platos
// ---------------------------------------------------------------------------
constexpr float ESCALA_PLATO_POR_DEFECTO = 420.0f;  // cuentas por gramo; se calibra
constexpr uint8_t BASCULA_PROMEDIO = 4;             // lecturas promediadas por muestra
constexpr uint32_t BASCULA_MAX_SIN_LECTURA_MS = 2000;  // después de esto el peso es inválido
constexpr float BASCULA_CAMBIO_PRESENCIA_G = 8.0f;  // cambio en el plato que inicia una visita

// ---------------------------------------------------------------------------
// Dispensador (un NEMA17 17HS8401 por tolva con TMC2209 que gira un tornillo sinfín)
// ---------------------------------------------------------------------------
// Con MS1/MS2 del TMC2209 a GND son 8 micropasos: 1600 pasos por vuelta. 800 Hz = 0.5 vuelta/s.
constexpr uint32_t MOTOR_PASOS_HZ = 800;
constexpr uint32_t MOTOR_REVERSA_DESATASCO_MS = 400;
constexpr float FLUJO_POR_DEFECTO_G_S = 8.0f;   // se calibra con CALIBRAR_FLUJO
constexpr float DISPENSADO_ANTICIPACION_G = 2.0f;  // comida que sigue cayendo al parar
constexpr uint32_t DISPENSADO_ASENTAR_MS = 1500;
constexpr uint32_t ATASCO_VENTANA_MS = 4000;    // sin subir el peso en esta ventana = atasco
constexpr float ATASCO_SUBIDA_MIN_G = 1.0f;
constexpr uint8_t ATASCO_REINTENTOS = 1;        // reversa corta y otro intento antes de JAM
constexpr float DISPENSADO_MINIMO_G = 2.0f;     // no vale la pena mover el motor por menos
constexpr bool RELLENAR_HASTA_RACION = true;    // descuenta lo que ya hay en el plato

// ---------------------------------------------------------------------------
// Nivel de tolva (VL53L0X en la tapa de cada tolva, medido hacia abajo)
// ---------------------------------------------------------------------------
constexpr float TOLVA_DISTANCIA_VACIA_CM = 30.0f;  // se calibra con NIVEL_VACIO
constexpr float TOLVA_DISTANCIA_LLENA_CM = 4.0f;   // se calibra con NIVEL_LLENO
constexpr float TOLVA_BAJA_PCT = 15.0f;            // HOPPER_LOW por debajo de esto
constexpr float TOLVA_REARME_PCT = 25.0f;          // vuelve a avisar tras rellenar arriba de esto
constexpr uint32_t NIVEL_PERIODO_MS = 5000;
constexpr uint8_t NIVEL_MUESTRAS = 5;              // mediana de 5 lecturas
// Sensor de presencia frente a los platos (J19): algo más cerca que esto es una mascota.
constexpr uint16_t PRESENCIA_UMBRAL_MM = 350;
constexpr uint32_t TOF_PERIODO_MS = 100;
constexpr float CAMBIO_ESTADO_TOLVA_PCT = 5.0f;    // status inmediato si cambia más que esto
constexpr float CAMBIO_ESTADO_PLATO_G = 10.0f;

// ---------------------------------------------------------------------------
// Reconocimiento
// ---------------------------------------------------------------------------
constexpr const char* RUTA_MODELO = "/model.tflite";
constexpr const char* RUTA_MODELO_TMP = "/model.tmp";
constexpr const char* RUTA_MODELO_RESPALDO = "/model.bak";
constexpr const char* RUTA_MODELO_VERSION = "/model.ver";
constexpr size_t TFLITE_ARENA_BYTES = 1536 * 1024;  // en PSRAM
// Rango al que se lleva cada pixel (0..255) antes de cuantizar: 0..1 para modelos entrenados con
// Rescaling(1/255), -1..1 para MobileNet. Debe coincidir con el entrenamiento.
constexpr float MODELO_ENTRADA_MIN = 0.0f;
constexpr float MODELO_ENTRADA_MAX = 1.0f;
constexpr uint8_t CAMARA_CALIDAD_JPEG = 12;   // 0-63, menor = mejor calidad
constexpr float UMBRAL_CONFIANZA = 0.70f;     // debajo de esto la foto se sube a la Pi
constexpr uint8_t FOTOS_POR_VISITA = 3;       // se promedian las probabilidades
constexpr uint32_t RFID_VIGENCIA_MS = 10000;  // una lectura RFID sirve para la visita actual

// ---------------------------------------------------------------------------
// Visitas y horarios
// ---------------------------------------------------------------------------
constexpr uint32_t VISITA_AUSENCIA_CIERRE_MS = 20000;  // sin presencia este tiempo = se fue
constexpr uint32_t VISITA_DURACION_MAX_MS = 15UL * 60UL * 1000UL;
constexpr uint32_t VISITA_ESPERA_ENTRE_MS = 5000;       // pausa antes de aceptar otra visita
constexpr float VISITA_CAMBIO_MIN_G = 2.0f;             // para publicar visitas de clase Nada
constexpr int VENTANA_COMIDA_MIN = 180;  // un horario sigue disponible 3 h si la mascota no llega

// ---------------------------------------------------------------------------
// OTA
// ---------------------------------------------------------------------------
constexpr uint32_t OTA_VALIDACION_MS = 60000;  // el firmware nuevo debe conectar a MQTT en 60 s
constexpr uint8_t OTA_ARRANQUES_MAX = 3;       // reinicios en periodo de prueba antes de revertir
