#include "visitas.h"

#include <Arduino.h>
#include <math.h>

#include "basculas.h"
#include "config.h"
#include "configuracion.h"
#include "dispensador.h"
#include "logica/planificador.h"
#include "logica/racion.h"
#include "logica/visita.h"
#include "publicador.h"
#include "reloj.h"
#include "rfid.h"
#include "vision.h"

namespace visitas {

namespace {

constexpr uint32_t ESPERA_DISPENSADOR_MS = 30000;
constexpr uint32_t ACTUALIZAR_BASE_MS = 30000;

enum class Fase { Libre, Reconocer, EsperarDispensador, Dispensando, Comiendo, Pausa };

Fase fase = Fase::Libre;
uint32_t faseDesdeMs = 0;
uint32_t inicioMs = 0;
uint32_t ultimaPresenciaMs = 0;
uint32_t baseActualizadaMs = 0;

float base[2] = {NAN, NAN};          // peso de los platos sin nadie
float ultimoPeso[2] = {NAN, NAN};
logica::Visita visita;
float antes[2] = {NAN, NAN};
int tolvaDispensar = 0;
double gramosDispensar = 0;

void cambiarFase(Fase nueva) {
  fase = nueva;
  faseDesdeMs = millis();
}

bool hayPresencia() {
  bool pir = USAR_PIR && digitalRead(PIN_PRESENCIA) == HIGH;
  bool pesoCambio = false;
  for (int i = 0; i < 2; i++) {
    float g = basculas::gramos(i + 1);
    if (!isnan(g) && !isnan(ultimoPeso[i]) && fabsf(g - ultimoPeso[i]) > 1.0f) pesoCambio = true;
    ultimoPeso[i] = g;
  }
  return pir || pesoCambio;
}

bool debeEmpezar() {
  if (USAR_PIR && digitalRead(PIN_PRESENCIA) == HIGH) return true;
  if (rfid::hayLecturaNueva()) return true;
  for (int i = 0; i < 2; i++) {
    float g = basculas::gramos(i + 1);
    if (!isnan(g) && !isnan(base[i]) && fabsf(g - base[i]) > BASCULA_CAMBIO_PRESENCIA_G) {
      return true;
    }
  }
  return false;
}

void actualizarBase() {
  if (millis() - baseActualizadaMs < ACTUALIZAR_BASE_MS && !isnan(base[0]) && !isnan(base[1])) {
    return;
  }
  for (int i = 0; i < 2; i++) base[i] = basculas::gramos(i + 1);
  baseActualizadaMs = millis();
}

void empezar() {
  inicioMs = millis();
  ultimaPresenciaMs = inicioMs;
  visita = logica::Visita{};
  visita.eventId = publicador::nuevoEventId();
  visita.startedAt = reloj::ahora();
  for (int i = 0; i < 2; i++) {
    // Si la visita empezó por cambio de peso, el peso "antes" es la base previa.
    antes[i] = !isnan(base[i]) ? base[i] : basculas::gramos(i + 1);
    ultimoPeso[i] = basculas::gramos(i + 1);
  }
  tolvaDispensar = 0;
  log_i("Visita %s iniciada", visita.eventId.c_str());
  cambiarFase(Fase::Reconocer);
}

void reconocer() {
  vision::Captura captura;
  bool ok = vision::reconocer(FOTOS_POR_VISITA, captura);
  std::string etiqueta = USAR_RFID ? rfid::ultima(RFID_VIGENCIA_MS) : "";
  const logica::ConfigAlimentador& config = configuracion::actual();

  logica::ResultadoClase resultado = ok ? captura.resultado : logica::ResultadoClase{};
  if (!ok && !etiqueta.empty()) {
    // Sin modelo o sin cámara, el RFID dice qué mascota es.
    for (const logica::Mascota& m : config.mascotas) {
      if (logica::rfidCoincide(m.rfid, etiqueta)) {
        resultado.clase = m.especie;
        resultado.confianza = 1.0f;
        break;
      }
    }
  }
  visita.clase = resultado.clase;
  visita.confianza = resultado.confianza;

  if (logica::esDudosa(resultado, UMBRAL_CONFIANZA) && !captura.jpeg.empty()) {
    captura.resultado = resultado;
    vision::subirFoto(captura, visita.eventId);
  }

  logica::Identificacion id = logica::identificarMascota(
      config, resultado.clase, etiqueta, configuracion::tieneComidaDisponible);
  visita.petId = id.petId;

  const logica::Mascota* mascota = config.buscarMascota(id.petId);
  if (mascota && configuracion::tieneComidaDisponible(mascota->id)) {
    double gramos = logica::calcularRacion(mascota->gramosPorComida,
                                           basculas::gramos(mascota->tolva), RELLENAR_HASTA_RACION,
                                           DISPENSADO_MINIMO_G, logica::MAX_GRAMOS_RACION);
    // La comida cuenta como servida aunque el plato ya tuviera suficiente.
    configuracion::registrarComida(mascota->id, reloj::ahora());
    if (gramos > 0) {
      tolvaDispensar = mascota->tolva;
      gramosDispensar = gramos;
      cambiarFase(Fase::EsperarDispensador);
      return;
    }
  }
  cambiarFase(Fase::Comiendo);
}

void dispensar() {
  if (dispensador::ocupado()) {
    if (millis() - faseDesdeMs > ESPERA_DISPENSADOR_MS) cambiarFase(Fase::Comiendo);
    return;
  }
  cambiarFase(Fase::Dispensando);
  dispensador::dispensar(tolvaDispensar, gramosDispensar, [](const dispensador::Resultado& r) {
    visita.dispensedG = r.dispensadoG;
    if (fase == Fase::Dispensando) cambiarFase(Fase::Comiendo);
  });
}

void terminar() {
  visita.endedAt = reloj::ahora();
  float despues[2];
  double cambio[2];
  for (int i = 0; i < 2; i++) {
    despues[i] = basculas::gramos(i + 1);
    cambio[i] = despues[i] - antes[i];
  }
  int plato = logica::platoDeVisita(visita.clase, cambio[0], cambio[1]);
  visita.plateBeforeG = isnan(antes[plato - 1]) ? 0 : antes[plato - 1];
  visita.plateAfterG = isnan(despues[plato - 1]) ? 0 : despues[plato - 1];
  if (visita.plateAfterG < 0) visita.plateAfterG = 0;
  if (visita.plateBeforeG < 0) visita.plateBeforeG = 0;

  if (logica::debePublicarVisita(visita.clase, visita.dispensedG, cambio[plato - 1],
                                 VISITA_CAMBIO_MIN_G)) {
    publicador::visita(visita);
  } else {
    log_i("Falsa alarma de presencia, no se publica");
  }
  for (int i = 0; i < 2; i++) base[i] = despues[i];
  baseActualizadaMs = millis();
  cambiarFase(Fase::Pausa);
}

}  // namespace

void iniciar() {
  if (USAR_PIR) pinMode(PIN_PRESENCIA, INPUT);
}

void atender() {
  switch (fase) {
    case Fase::Libre:
      actualizarBase();
      if (debeEmpezar()) empezar();
      break;
    case Fase::Reconocer:
      reconocer();
      break;
    case Fase::EsperarDispensador:
      dispensar();
      break;
    case Fase::Dispensando:
      // El peso sube por la comida, no por la mascota: no cuenta como presencia.
      ultimaPresenciaMs = millis();
      break;
    case Fase::Comiendo:
      if (hayPresencia()) ultimaPresenciaMs = millis();
      if (logica::visitaTermino(millis(), inicioMs, ultimaPresenciaMs, VISITA_AUSENCIA_CIERRE_MS,
                                VISITA_DURACION_MAX_MS)) {
        terminar();
      }
      break;
    case Fase::Pausa:
      if (millis() - faseDesdeMs >= VISITA_ESPERA_ENTRE_MS) cambiarFase(Fase::Libre);
      break;
  }
}

bool enCurso() { return fase != Fase::Libre && fase != Fase::Pausa; }

}  // namespace visitas
