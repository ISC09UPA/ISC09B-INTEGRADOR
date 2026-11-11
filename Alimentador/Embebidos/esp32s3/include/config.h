#pragma once

// Pines y constantes del alimentador. Todo lo que dependa del hardware se ajusta aquí.
// Las credenciales van en secrets.h (copiar secrets.example.h).

#include <stdint.h>

#define FIRMWARE_VERSION "1.0.0"

// ---------------------------------------------------------------------------
// Pines por placa
// ---------------------------------------------------------------------------
#if defined(PLACA_XIAO_S3_SENSE)
// Seeed XIAO ESP32S3 Sense: solo hay 11 pines libres (D0..D10), se usan todos.
// La ranura microSD de la placa de expansión comparte GPIO7/8/9: no se usa.
constexpr int PIN_SERVO_PERRO = 1;    // D0
constexpr int PIN_SERVO_GATO = 2;     // D1
constexpr int PIN_HX711_PERRO_SCK = 3;   // D2
constexpr int PIN_HX711_PERRO_DOUT = 4;  // D3
constexpr int PIN_HX711_GATO_DOUT = 5;   // D4
constexpr int PIN_HX711_GATO_SCK = 43;   // D6 (TX0, el monitor serie va por USB)
constexpr int PIN_ULTRASONICO_TRIG = 6;  // D5, compartido por los dos sensores
constexpr int PIN_ULTRASONICO_ECHO_PERRO = 7;  // D8
constexpr int PIN_ULTRASONICO_ECHO_GATO = 8;   // D9
constexpr int PIN_PRESENCIA = 9;         // D10, sensor PIR
constexpr int PIN_RFID_RX = 44;          // D7 (RX0), lector RDM6300 a 9600 baudios
constexpr int PIN_LED_ESTADO = 21;       // LED de usuario de la XIAO (activo en bajo)
constexpr bool LED_ACTIVO_EN_BAJO = true;

// Cámara OV2640 de la placa Sense
constexpr int CAM_PIN_PWDN = -1;
constexpr int CAM_PIN_RESET = -1;
constexpr int CAM_PIN_XCLK = 10;
constexpr int CAM_PIN_SIOD = 40;
constexpr int CAM_PIN_SIOC = 39;
constexpr int CAM_PIN_D7 = 48;
constexpr int CAM_PIN_D6 = 11;
constexpr int CAM_PIN_D5 = 12;
constexpr int CAM_PIN_D4 = 14;
constexpr int CAM_PIN_D3 = 16;
constexpr int CAM_PIN_D2 = 18;
constexpr int CAM_PIN_D1 = 17;
constexpr int CAM_PIN_D0 = 15;
constexpr int CAM_PIN_VSYNC = 38;
constexpr int CAM_PIN_HREF = 47;
constexpr int CAM_PIN_PCLK = 13;

#elif defined(PLACA_ESP32S3_CAM)
// ESP32-S3-WROOM-1 N8R8 con OV2640 (Freenove ESP32-S3 CAM y similares; la cámara usa
// el mismo mapeo que la ESP32-S3-EYE). GPIO35-37 los ocupa la PSRAM octal, 19/20 el USB,
// 43/44 el monitor serie y 48 el LED RGB.
constexpr int PIN_SERVO_PERRO = 1;
constexpr int PIN_SERVO_GATO = 2;
constexpr int PIN_HX711_PERRO_DOUT = 14;
constexpr int PIN_HX711_PERRO_SCK = 21;
constexpr int PIN_HX711_GATO_DOUT = 47;
constexpr int PIN_HX711_GATO_SCK = 42;
constexpr int PIN_ULTRASONICO_TRIG = 41;
constexpr int PIN_ULTRASONICO_ECHO_PERRO = 40;
constexpr int PIN_ULTRASONICO_ECHO_GATO = 39;
constexpr int PIN_PRESENCIA = 38;
constexpr int PIN_RFID_RX = 3;  // Pin de arranque solo si se quema el eFuse de JTAG; libre por defecto
constexpr int PIN_LED_ESTADO = -1;
constexpr bool LED_ACTIVO_EN_BAJO = false;

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

#else
#error "Define PLACA_ESP32S3_CAM o PLACA_XIAO_S3_SENSE en platformio.ini"
#endif

// Módulos opcionales: poner en false si no está conectado el sensor.
constexpr bool USAR_RFID = true;
constexpr bool USAR_PIR = true;

// ---------------------------------------------------------------------------
// Red, MQTT y HTTP
// ---------------------------------------------------------------------------
constexpr uint32_t WIFI_REINTENTO_MIN_MS = 2000;
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
// Dispensador (un servo de rotación continua por tolva que mueve un tornillo sinfín)
// ---------------------------------------------------------------------------
constexpr uint16_t SERVO_PULSO_PARO_US = 1500;
constexpr uint16_t SERVO_PULSO_AVANCE_US = 1800;
constexpr uint16_t SERVO_PULSO_REVERSA_US = 1200;
constexpr uint32_t SERVO_REVERSA_DESATASCO_MS = 400;
constexpr float FLUJO_POR_DEFECTO_G_S = 8.0f;   // se calibra con CALIBRAR_FLUJO
constexpr float DISPENSADO_ANTICIPACION_G = 2.0f;  // comida que sigue cayendo al parar
constexpr uint32_t DISPENSADO_ASENTAR_MS = 1500;
constexpr uint32_t ATASCO_VENTANA_MS = 4000;    // sin subir el peso en esta ventana = atasco
constexpr float ATASCO_SUBIDA_MIN_G = 1.0f;
constexpr uint8_t ATASCO_REINTENTOS = 1;        // reversa corta y otro intento antes de JAM
constexpr float DISPENSADO_MINIMO_G = 2.0f;     // no vale la pena mover el motor por menos
constexpr bool RELLENAR_HASTA_RACION = true;    // descuenta lo que ya hay en el plato

// ---------------------------------------------------------------------------
// Nivel de tolva (ultrasónico JSN-SR04T / HC-SR04P a 3.3 V)
// ---------------------------------------------------------------------------
constexpr float TOLVA_DISTANCIA_VACIA_CM = 30.0f;  // se calibra con NIVEL_VACIO
constexpr float TOLVA_DISTANCIA_LLENA_CM = 4.0f;   // se calibra con NIVEL_LLENO
constexpr float TOLVA_BAJA_PCT = 15.0f;            // HOPPER_LOW por debajo de esto
constexpr float TOLVA_REARME_PCT = 25.0f;          // vuelve a avisar tras rellenar arriba de esto
constexpr uint32_t NIVEL_PERIODO_MS = 5000;
constexpr uint8_t NIVEL_MUESTRAS = 5;              // mediana de 5 lecturas
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
