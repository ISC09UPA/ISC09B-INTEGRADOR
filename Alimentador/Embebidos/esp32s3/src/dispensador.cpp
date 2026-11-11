#include "dispensador.h"

#include <Arduino.h>
#include <math.h>

#include "basculas.h"
#include "calibracion.h"
#include "config.h"
#include "logica/racion.h"
#include "publicador.h"

namespace dispensador {

namespace {

// PWM de 50 Hz con 14 bits: un periodo de 20 000 µs son 16 384 cuentas.
constexpr uint32_t SERVO_FRECUENCIA_HZ = 50;
constexpr uint8_t SERVO_RESOLUCION_BITS = 14;
constexpr int CANALES_LEDC[2] = {4, 5};  // la cámara usa el canal 0 para XCLK

enum class Fase { Libre, Dispensando, Reversa };

Fase fase = Fase::Libre;
int tolvaActiva = 0;
logica::ControlDispensado control;
AlTerminar alTerminar;
uint32_t reversaDesdeMs = 0;
uint8_t reintentos = 0;

int pinServo(int tolva) { return tolva == 1 ? PIN_SERVO_PERRO : PIN_SERVO_GATO; }

void pulso(int tolva, uint16_t microsegundos) {
  uint32_t cuentas = (static_cast<uint32_t>(microsegundos) << SERVO_RESOLUCION_BITS) / 20000;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(pinServo(tolva), cuentas);
#else
  ledcWrite(CANALES_LEDC[tolva - 1], cuentas);
#endif
}

void parar(int tolva) { pulso(tolva, SERVO_PULSO_PARO_US); }

logica::ParametrosDispensado parametros(int tolva) {
  logica::ParametrosDispensado p;
  float flujo = calibracion::actual().flujo[tolva - 1];
  p.gramosPorSegundo = flujo > 0 ? flujo : FLUJO_POR_DEFECTO_G_S;
  p.anticipacionG = DISPENSADO_ANTICIPACION_G;
  p.asentarMs = DISPENSADO_ASENTAR_MS;
  p.ventanaAtascoMs = ATASCO_VENTANA_MS;
  p.subidaMinimaG = ATASCO_SUBIDA_MIN_G;
  return p;
}

void terminar(bool atasco, const char* error) {
  parar(tolvaActiva);
  Resultado r;
  r.tolva = tolvaActiva;
  r.objetivoG = control.objetivoG();
  r.dispensadoG = control.dispensadoG();
  r.atasco = atasco;
  r.ok = !atasco && control.exitoso();
  if (!r.ok) r.error = error ? error : "dispensado incompleto";
  fase = Fase::Libre;
  tolvaActiva = 0;

  if (atasco) {
    char detalle[64];
    snprintf(detalle, sizeof(detalle), "sin flujo tras %.1f de %.1f g", r.dispensadoG, r.objetivoG);
    publicador::evento(logica::TipoEvento::Atasco, r.tolva, detalle);
  }
  AlTerminar cb = alTerminar;
  alTerminar = nullptr;
  if (cb) cb(r);
}

}  // namespace

void iniciar() {
  for (int tolva = 1; tolva <= 2; tolva++) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(pinServo(tolva), SERVO_FRECUENCIA_HZ, SERVO_RESOLUCION_BITS);
#else
    ledcSetup(CANALES_LEDC[tolva - 1], SERVO_FRECUENCIA_HZ, SERVO_RESOLUCION_BITS);
    ledcAttachPin(pinServo(tolva), CANALES_LEDC[tolva - 1]);
#endif
    parar(tolva);
  }
}

bool ocupado() { return fase != Fase::Libre; }

bool dispensar(int tolva, double gramos, AlTerminar cb) {
  if (ocupado() || (tolva != 1 && tolva != 2) || !(gramos > 0)) return false;
  float peso = basculas::gramos(tolva);
  if (isnan(peso)) {
    // Sin báscula no se puede controlar la ración ni detectar atascos.
    Resultado r;
    r.tolva = tolva;
    r.objetivoG = gramos;
    r.error = "bascula sin lectura";
    if (cb) cb(r);
    return true;
  }
  tolvaActiva = tolva;
  alTerminar = std::move(cb);
  reintentos = 0;
  control.iniciar(gramos, peso, millis(), parametros(tolva));
  fase = Fase::Dispensando;
  pulso(tolva, SERVO_PULSO_AVANCE_US);
  log_i("Dispensando %.1f g de la tolva %d (plato en %.1f g)", gramos, tolva, peso);
  return true;
}

void atender() {
  if (fase == Fase::Libre) return;
  uint32_t ahora = millis();
  float peso = basculas::gramos(tolvaActiva);

  if (fase == Fase::Reversa) {
    if (ahora - reversaDesdeMs < SERVO_REVERSA_DESATASCO_MS) return;
    control.reanudar(ahora, peso);
    pulso(tolvaActiva, SERVO_PULSO_AVANCE_US);
    fase = Fase::Dispensando;
    return;
  }

  using Estado = logica::ControlDispensado::Estado;
  Estado estado = control.paso(ahora, peso);
  if (!control.motorEncendido()) parar(tolvaActiva);

  switch (estado) {
    case Estado::Atasco:
      if (reintentos < ATASCO_REINTENTOS) {
        reintentos++;
        log_w("Posible atasco en tolva %d, reversa corta", tolvaActiva);
        pulso(tolvaActiva, SERVO_PULSO_REVERSA_US);
        reversaDesdeMs = ahora;
        fase = Fase::Reversa;
      } else {
        terminar(true, "atasco");
      }
      break;
    case Estado::Terminado:
      terminar(false, nullptr);
      break;
    case Estado::TiempoAgotado:
      terminar(false, "tiempo agotado");
      break;
    default:
      break;
  }
}

void detenerTodo() {
  parar(1);
  parar(2);
  if (fase != Fase::Libre) {
    control.cancelar();
    terminar(false, "cancelado");
  }
}

bool calibrarFlujo(int tolva, double segundos, double& gramosPorSegundo) {
  if (ocupado() || (tolva != 1 && tolva != 2) || !(segundos > 0)) return false;
  auto pesoEstable = [tolva]() {
    uint32_t inicio = millis();
    while (millis() - inicio < 1500) {
      basculas::atender();
      delay(20);
    }
    return basculas::gramos(tolva);
  };

  float antes = pesoEstable();
  if (isnan(antes)) return false;
  pulso(tolva, SERVO_PULSO_AVANCE_US);
  delay(static_cast<uint32_t>(segundos * 1000));
  parar(tolva);
  delay(DISPENSADO_ASENTAR_MS);
  float despues = pesoEstable();
  if (isnan(despues)) return false;

  double flujo = logica::calibrarFlujo(despues - antes, segundos);
  if (flujo <= 0) return false;
  gramosPorSegundo = flujo;
  calibracion::actual().flujo[tolva - 1] = static_cast<float>(flujo);
  return calibracion::guardar();
}

}  // namespace dispensador
