#include "dispensador.h"

#include <Arduino.h>
#include <math.h>

#include "basculas.h"
#include "calibracion.h"
#include "config.h"
#include "expansor.h"
#include "logica/racion.h"
#include "publicador.h"

namespace dispensador {

namespace {

// El STEP de cada TMC2209 es una señal cuadrada de LEDC: cada flanco de subida es un micropaso.
// EN (activo en bajo) y DIR van por el MCP23017. El motor se deshabilita al parar para que no
// se caliente; el tornillo sinfín no necesita par de retención.
constexpr uint8_t STEP_RESOLUCION_BITS = 8;
constexpr uint32_t STEP_DUTY_MARCHA = 128;  // 50 %
constexpr int CANALES_LEDC[2] = {4, 5};  // la cámara usa el canal 0 para XCLK

enum class Fase { Libre, Dispensando, Reversa };

Fase fase = Fase::Libre;
int tolvaActiva = 0;
logica::ControlDispensado control;
AlTerminar alTerminar;
uint32_t reversaDesdeMs = 0;
uint8_t reintentos = 0;

int pinStep(int tolva) { return tolva == 1 ? PIN_STEP_PERRO : PIN_STEP_GATO; }
uint8_t bitEn(int tolva) { return tolva == 1 ? MCP_EN1 : MCP_EN2; }
uint8_t bitDir(int tolva) { return tolva == 1 ? MCP_DIR1 : MCP_DIR2; }

void pasos(int tolva, bool marcha) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(pinStep(tolva), marcha ? STEP_DUTY_MARCHA : 0);
#else
  ledcWrite(CANALES_LEDC[tolva - 1], marcha ? STEP_DUTY_MARCHA : 0);
#endif
}

// Si el motor gira al revés, se invierte aquí o se voltea un par de bobinas en J11/J12.
void girar(int tolva, bool avance) {
  expansor::escribir(bitDir(tolva), avance);
  expansor::escribir(bitEn(tolva), false);
  delayMicroseconds(5);  // DIR debe estar estable antes del primer paso
  pasos(tolva, true);
}

void parar(int tolva) {
  pasos(tolva, false);
  expansor::escribir(bitEn(tolva), true);
}

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
    ledcAttach(pinStep(tolva), MOTOR_PASOS_HZ, STEP_RESOLUCION_BITS);
#else
    ledcSetup(CANALES_LEDC[tolva - 1], MOTOR_PASOS_HZ, STEP_RESOLUCION_BITS);
    ledcAttachPin(pinStep(tolva), CANALES_LEDC[tolva - 1]);
#endif
    parar(tolva);
  }
}

bool ocupado() { return fase != Fase::Libre; }

bool dispensar(int tolva, double gramos, AlTerminar cb) {
  if (ocupado() || (tolva != 1 && tolva != 2) || !(gramos > 0)) return false;
  if (!expansor::disponible()) {
    // Sin el MCP23017 no se pueden habilitar los TMC2209.
    Resultado r;
    r.tolva = tolva;
    r.objetivoG = gramos;
    r.error = "expansor sin respuesta";
    if (cb) cb(r);
    return true;
  }
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
  girar(tolva, true);
  log_i("Dispensando %.1f g de la tolva %d (plato en %.1f g)", gramos, tolva, peso);
  return true;
}

void atender() {
  if (fase == Fase::Libre) return;
  uint32_t ahora = millis();
  float peso = basculas::gramos(tolvaActiva);

  if (fase == Fase::Reversa) {
    if (ahora - reversaDesdeMs < MOTOR_REVERSA_DESATASCO_MS) return;
    control.reanudar(ahora, peso);
    girar(tolvaActiva, true);
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
        girar(tolvaActiva, false);
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
  if (isnan(antes) || !expansor::disponible()) return false;
  girar(tolva, true);
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
