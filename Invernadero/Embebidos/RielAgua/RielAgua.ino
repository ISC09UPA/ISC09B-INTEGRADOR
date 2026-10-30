// ============================================================
//  Banda de riego - ESP32 + L298N (canal B) + bomba
// ============================================================

// ===== PINES =====
const int in3   = 25;  // IN3 del L298N
const int in4   = 26;  // IN4 del L298N
const int enB   = 27;  // ENB del L298N (PWM) -> quitar el jumper de ENB
const int bomba = 14;  // Hacia módulo relé / MOSFET de la bomba

// ===== FINAL DE CARRERA (opcional) =====
// true  = usa microswitch en la posición inicial (recomendado)
// false = regresa solo por tiempo
const bool usarFinCarrera = false;
const int  finCarrera = 33;   // Un lado del switch a GPIO 33, el otro a GND

// ===== PWM =====
const int pwmFreq = 1000;
const int pwmRes  = 8;          // 0 a 255

// ===== CALIBRACIÓN (ajusta estos valores) =====
const int velocidadAvance  = 150;   // 0-255. Más bajo = más control
const int velocidadRegreso = 150;

const unsigned long tiempoPorCuadro = 110;  // ms para avanzar ~4.4 cm (CALIBRAR)
const float factorRegreso = 1.0;            // <1 si regresa de más, >1 si se queda corto

const unsigned long tiempoFrenado  = 150;   // pausa para que la banda se asiente
const unsigned long tiempoRiego    = 3000;  // ms de bomba encendida por cuadro
const unsigned long pausaCiclo     = 5000;  // pausa antes de repetir
const unsigned long limiteRegreso  = 8000;  // seguridad con final de carrera

const int totalCuadros = 4;

// ============================================================
void setPWM(int valor) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(enB, valor);
#else
  ledcWrite(0, valor);
#endif
}

void detenerMotor() {
  digitalWrite(in3, LOW);
  digitalWrite(in4, LOW);
  setPWM(0);
  delay(tiempoFrenado);   // deja que la inercia termine antes de seguir
}

void moverTiempo(bool adelante, int velocidad, unsigned long tiempo) {
  digitalWrite(in3, adelante ? HIGH : LOW);
  digitalWrite(in4, adelante ? LOW : HIGH);
  setPWM(velocidad);
  delay(tiempo);
  detenerMotor();
}

void regresarAlInicio() {
  if (usarFinCarrera) {
    // Retrocede hasta tocar el switch (con límite de seguridad)
    digitalWrite(in3, LOW);
    digitalWrite(in4, HIGH);
    setPWM(velocidadRegreso);
    unsigned long inicio = millis();
    while (digitalRead(finCarrera) == HIGH && millis() - inicio < limiteRegreso) {
      delay(5);
    }
    detenerMotor();
  } else {
    unsigned long t = (unsigned long)(tiempoPorCuadro * totalCuadros * factorRegreso);
    moverTiempo(false, velocidadRegreso, t);
  }
}

void regar() {
  digitalWrite(bomba, HIGH);
  delay(tiempoRiego);
  digitalWrite(bomba, LOW);
  delay(300);
}

// ============================================================
void setup() {
  pinMode(in3, OUTPUT);
  pinMode(in4, OUTPUT);
  pinMode(bomba, OUTPUT);
  digitalWrite(bomba, LOW);

  if (usarFinCarrera) pinMode(finCarrera, INPUT_PULLUP);

#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(enB, pwmFreq, pwmRes);
#else
  ledcSetup(0, pwmFreq, pwmRes);
  ledcAttachPin(enB, 0);
#endif

  detenerMotor();

  // Al encender, lleva la banda al punto de inicio
  if (usarFinCarrera) regresarAlInicio();
}

void loop() {
  for (int cuadro = 1; cuadro <= totalCuadros; cuadro++) {
    moverTiempo(true, velocidadAvance, tiempoPorCuadro);  // 1. Avanzar un cuadro
    regar();                                               // 2. Regar
  }

  regresarAlInicio();                                      // 3. Volver al inicio
  delay(pausaCiclo);                                       // 4. Esperar y repetir
}
