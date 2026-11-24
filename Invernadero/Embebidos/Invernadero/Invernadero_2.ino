#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <DHT.h>
#include <Adafruit_MCP3008.h>
#include <Adafruit_PWMServoDriver.h>

// ============================================================
// NUEVO: MODO DE PRUEBA (sin tierra ni agua)
// true  = las lecturas de suelo se simulan desde el Monitor Serie
//         (escribe 1, 2, 3 o 4 para marcar esa maceta como seca,
//          escribe 0 para dejar todas húmedas)
// false = usa los sensores YL-69 reales
// ============================================================
const bool MODO_PRUEBA = true;

// ============================================================
// PINES DEL INVERNADERO
// ============================================================

// DHT11
#define DHT_PIN 4
#define DHT_TYPE DHT11

// LEDs
#define LED_ROJO 16
#define LED_VERDE 17

// Buzzer activo
#define BUZZER 18

// Bomba
//#define BOMBA 23
#define BOMBA 23   // NUEVO: reactivada (relé/MOSFET, o un LED con resistencia para probar)

// MCP3008
#define MCP_CLK 14
#define MCP_MISO 19
#define MCP_MOSI 13
#define MCP_CS 27

// PCA9685
#define PCA_SDA 21
#define PCA_SCL 22

// ============================================================
// PINES DE LA BANDA - L298N
// ============================================================

const int in1 = 25;
const int in2 = 26;
const int enB = 33;

// Final de carrera
const bool usarFinCarrera = false;
//const int finCarrera = 33;   // ANTES: chocaba con enB (mismo GPIO 33)
const int finCarrera = 32;     // CORRECCIÓN: un lado del switch a GPIO 32 y el otro a GND

// ============================================================
// OBJETOS
// ============================================================

DHT dht(DHT_PIN, DHT_TYPE);

Adafruit_MCP3008 mcp;
Adafruit_PWMServoDriver pca(0x40);

// ============================================================
// TEMPERATURA
// ============================================================

const float TEMP_ABRIR = 27.0;
const float TEMP_CERRAR = 25.0;
const float TEMP_RIESGO = 29.0;

bool servosAbiertos = false;

// ============================================================
// SERVOMOTORES PCA9685
// ============================================================

#define SERVO1 0
#define SERVO2 1

#define SERVO_CERRADO 150
#define SERVO_ABIERTO 450

// ============================================================
// SENSORES DE HUMEDAD
// ============================================================

int humedadSuelo[4];
int UMBRAL_SECO = 600;

// NUEVO: simulación de sensores (solo se usa si MODO_PRUEBA = true)
bool simuladoSeco[4] = {false, false, false, false};
const int VALOR_SIMULADO_SECO = 900;
const int VALOR_SIMULADO_HUMEDO = 300;

// NUEVO: tiempo mínimo entre riegos de la misma maceta
// (en prueba son 10 s, en uso real 5 minutos)
const unsigned long esperaEntreRiegos = MODO_PRUEBA ? 10000UL : 300000UL;
unsigned long ultimoRiego[4] = {0, 0, 0, 0};

// ============================================================
// BANDA DE RIEGO
// ============================================================

// PWM
const int pwmFreq = 1000;
const int pwmRes = 8;

// Velocidades
const int velocidadAvance = 150;
const int velocidadRegreso = 150;

// Calibración
const unsigned long tiempoPorCuadro = 110;
const float factorRegreso = 1.0;

// Tiempos
const unsigned long tiempoFrenado = 150;
const unsigned long tiempoRiego = 3000;
const unsigned long pausaCiclo = 5000;
const unsigned long limiteRegreso = 8000;

const int totalCuadros = 4;

// NUEVO: posición actual de la banda (0 = inicio, 1 a 4 = sobre cada maceta)
int posicionActual = 0;

// ============================================================
// CONTROL PWM DE LA BANDA
// ============================================================

void setPWM(int valor) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(enB, valor);
#else
  ledcWrite(0, valor);
#endif
}

void detenerMotor() {
  digitalWrite(in1, LOW);
  digitalWrite(in2, LOW);
  setPWM(0);
  delay(tiempoFrenado);
}

void moverTiempo(bool adelante, int velocidad,
                 unsigned long tiempo) {

  digitalWrite(in1, adelante ? HIGH : LOW);
  digitalWrite(in2, adelante ? LOW : HIGH);

  setPWM(velocidad);
  delay(tiempo);

  detenerMotor();
}

// ============================================================
// NUEVO: IR A UNA MACETA ESPECÍFICA (1 a 4)
// Se mueve desde la posición actual hasta el cuadro indicado
// ============================================================

void irACuadro(int destino) {

  int diferencia = destino - posicionActual;

  if (diferencia == 0) return;

  bool adelante = diferencia > 0;

  unsigned long t = (unsigned long)abs(diferencia) * tiempoPorCuadro;

  if (!adelante) {
    t = (unsigned long)(t * factorRegreso);
  }

  moverTiempo(adelante,
              adelante ? velocidadAvance : velocidadRegreso,
              t);

  posicionActual = destino;
}

// ============================================================
// REGRESAR BANDA AL INICIO
// ============================================================

void regresarAlInicio() {

  if (usarFinCarrera) {

    digitalWrite(in1, LOW);
    digitalWrite(in2, HIGH);
    setPWM(velocidadRegreso);

    unsigned long inicio = millis();

    while (digitalRead(finCarrera) == HIGH &&
           millis() - inicio < limiteRegreso) {
      delay(5);
    }

    detenerMotor();

  } else {

    // ANTES: siempre retrocedía los 4 cuadros completos
    //unsigned long t =
    //  (unsigned long)(tiempoPorCuadro *
    //                 totalCuadros *
    //                 factorRegreso);

    // CORRECCIÓN: retrocede solo lo que realmente avanzó
    unsigned long t =
      (unsigned long)(tiempoPorCuadro *
                     posicionActual *
                     factorRegreso);

    if (posicionActual > 0) {
      moverTiempo(false, velocidadRegreso, t);
    }
  }

  posicionActual = 0;   // NUEVO: la banda quedó en el inicio
}

// ============================================================
// RIEGO POR CUADRO
// ============================================================

//void regarCuadro() {
//
//  digitalWrite(BOMBA, HIGH);
//  delay(tiempoRiego);
//  digitalWrite(BOMBA, LOW);
//
//  delay(300);
//}

// NUEVO: versión activa de regarCuadro()
void regarCuadro() {

  digitalWrite(BOMBA, HIGH);
  delay(tiempoRiego);
  digitalWrite(BOMBA, LOW);

  delay(300);
}

// ============================================================
// SERVOMOTORES
// ============================================================

void abrirServos() {

  pca.setPWM(SERVO1, 0, SERVO_ABIERTO);
  pca.setPWM(SERVO2, 0, SERVO_ABIERTO);

  servosAbiertos = true;

  Serial.println("SERVOS ABIERTOS");
}

void cerrarServos() {

  pca.setPWM(SERVO1, 0, SERVO_CERRADO);
  pca.setPWM(SERVO2, 0, SERVO_CERRADO);

  servosAbiertos = false;

  Serial.println("SERVOS CERRADOS");
}

// ============================================================
// LECTURA DE SENSORES YL-69
// ============================================================

void leerHumedadSuelo() {

  for (int i = 0; i < 4; i++) {

    humedadSuelo[i] = mcp.readADC(i);

    // NUEVO: en modo prueba se reemplaza la lectura por la simulada
    if (MODO_PRUEBA) {
      humedadSuelo[i] = simuladoSeco[i] ? VALOR_SIMULADO_SECO
                                        : VALOR_SIMULADO_HUMEDO;
    }

    Serial.print("Sensor suelo ");
    Serial.print(i + 1);
    Serial.print(": ");

    Serial.println(humedadSuelo[i]);
  }
}

// ============================================================
// NUEVO: COMANDOS DEL MONITOR SERIE PARA PROBAR SIN TIERRA
// 1 a 4 = marca esa maceta como seca (otra vez la deja húmeda)
// 0     = todas húmedas
// ============================================================

void leerComandosPrueba() {

  while (Serial.available()) {

    char c = Serial.read();

    if (c >= '1' && c <= '4') {

      int i = c - '1';
      simuladoSeco[i] = !simuladoSeco[i];

      Serial.print("Maceta ");
      Serial.print(i + 1);
      Serial.println(simuladoSeco[i] ? " -> SECA (simulada)"
                                     : " -> HUMEDA (simulada)");

    } else if (c == '0') {

      for (int i = 0; i < 4; i++) simuladoSeco[i] = false;

      Serial.println("Todas las macetas -> HUMEDAS (simulado)");
    }
  }
}

// ============================================================
// CONTROL DE BOMBA POR HUMEDAD DESACTIVADO
// ============================================================

// Se desactivó el control anterior que encendía la bomba
// cuando algún sensor YL-69 detectaba suelo seco.
//
// La bomba ahora funciona exclusivamente durante el
// desplazamiento de la banda, mediante regarCuadro().
//
// NO activar simultáneamente el control anterior.

// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(115200);

  // LEDs
  pinMode(LED_ROJO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);

  // Buzzer
  pinMode(BUZZER, OUTPUT);

  // Bomba
//  pinMode(BOMBA, OUTPUT);
//  digitalWrite(BOMBA, LOW);

  // NUEVO: bomba activa
  pinMode(BOMBA, OUTPUT);
  digitalWrite(BOMBA, LOW);

  // Banda
//  pinMode(in3, OUTPUT);
//  pinMode(in4, OUTPUT);

  // CORRECCIÓN: faltaban estos pinMode con los nombres correctos
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);

  if (usarFinCarrera) {
    pinMode(finCarrera, INPUT_PULLUP);
  }

  // PWM L298N
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(enB, pwmFreq, pwmRes);
#else
  ledcSetup(0, pwmFreq, pwmRes);
  ledcAttachPin(enB, 0);
#endif

  detenerMotor();

  // DHT11
  dht.begin();

  // MCP3008
  SPI.begin(MCP_CLK, MCP_MISO, MCP_MOSI, MCP_CS);
  mcp.begin(MCP_CS);

  // PCA9685
  Wire.begin(PCA_SDA, PCA_SCL);

  pca.begin();
  pca.setPWMFreq(50);

  delay(500);

  cerrarServos();

  // Banda al punto inicial
  if (usarFinCarrera) {
    regresarAlInicio();
  }

  posicionActual = 0;   // NUEVO: se asume que la banda arranca en el inicio

  Serial.println("INVERNADERO INICIADO");

  // NUEVO: aviso del modo de prueba
  if (MODO_PRUEBA) {
    Serial.println("*** MODO PRUEBA ACTIVO ***");
    Serial.println("Escribe 1-4 para marcar una maceta seca, 0 para limpiar");
  }
}

// ============================================================
// LOOP
// ============================================================

void loop() {

  // NUEVO: lee los comandos del monitor serie (solo en modo prueba)
  if (MODO_PRUEBA) {
    leerComandosPrueba();
  }

  // ==========================================================
  // 1. TEMPERATURA Y HUMEDAD AMBIENTAL
  // ==========================================================

  float temperatura = dht.readTemperature();
  float humedadAmbiente = dht.readHumidity();

  if (isnan(temperatura) || isnan(humedadAmbiente)) {

    Serial.println("ERROR DHT11");

    digitalWrite(LED_ROJO, HIGH);
    digitalWrite(LED_VERDE, LOW);
    digitalWrite(BUZZER, HIGH);

    delay(2000);
    return;
  }

  Serial.println("==========================");

  Serial.print("Temperatura: ");
  Serial.print(temperatura);
  Serial.println(" C");

  Serial.print("Humedad ambiente: ");
  Serial.print(humedadAmbiente);
  Serial.println(" %");

  // ==========================================================
  // 2. CONTROL DE SERVOMOTORES
  // ==========================================================

  if (temperatura > TEMP_ABRIR && !servosAbiertos) {
    abrirServos();
  }

  if (temperatura < TEMP_CERRAR && servosAbiertos) {
    cerrarServos();
  }

  // ==========================================================
  // 3. CONTROL DE LEDS Y BUZZER
  // ==========================================================

  if (temperatura >= TEMP_RIESGO) {

    digitalWrite(LED_ROJO, HIGH);
    digitalWrite(LED_VERDE, LOW);
    digitalWrite(BUZZER, HIGH);

    Serial.println("ALERTA TEMPERATURA");

  } else {

    digitalWrite(LED_ROJO, LOW);
    digitalWrite(LED_VERDE, HIGH);
    digitalWrite(BUZZER, LOW);
  }

  // ==========================================================
  // 4. LECTURA DE SENSORES DE SUELO
  // ==========================================================

  leerHumedadSuelo();

  // ==========================================================
  // 5. CONTROL DE BANDA Y RIEGO
  // ==========================================================

  // ANTES: recorría siempre los 4 cuadros en cada ciclo
  //for (int cuadro = 1; cuadro <= totalCuadros; cuadro++) {
  //
  //  Serial.print("Cuadro: ");
  //  Serial.println(cuadro);
  //
  //  // Avanzar banda
  //  moverTiempo(true, velocidadAvance,
  //              tiempoPorCuadro);
  //
  //  // Regar cuadro
  //  //regarCuadro();
  //}

  // NUEVO: la banda solo va a las macetas que necesitan agua
  for (int i = 0; i < totalCuadros; i++) {

    bool seco = humedadSuelo[i] > UMBRAL_SECO;

    bool puedeRegar = (ultimoRiego[i] == 0) ||
                      (millis() - ultimoRiego[i] >= esperaEntreRiegos);

    if (seco && puedeRegar) {

      Serial.print("Cuadro: ");
      Serial.print(i + 1);
      Serial.println(" seco -> regando");

      // Avanzar banda hasta esa maceta
      irACuadro(i + 1);

      // Regar cuadro
      regarCuadro();

      ultimoRiego[i] = millis();
    }
  }

  // Regresar al inicio
  regresarAlInicio();

  // Esperar antes de repetir
  delay(pausaCiclo);
}
