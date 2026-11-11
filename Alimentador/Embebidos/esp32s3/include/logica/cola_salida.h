#pragma once

// Cola de mensajes que deben llegar a la Pi (visitas, eventos y resultados de comandos).
// Cada mensaje sale de la cola solo cuando llega el PUBACK de su publicación QoS 1. Si se cae
// la conexión, lo que estaba en vuelo se vuelve a mandar (la Pi descarta duplicados por eventId
// o por id de comando). Se guarda en LittleFS con serializar()/deserializar().

#include <stddef.h>
#include <stdint.h>

#include <deque>
#include <string>

namespace logica {

struct MensajeSalida {
  uint32_t seq = 0;
  std::string tema;
  std::string payload;
  uint16_t packetId = 0;  // 0 = no enviado todavía
};

class ColaSalida {
 public:
  explicit ColaSalida(size_t capacidad) : capacidad_(capacidad) {}

  // Si está llena descarta el mensaje más viejo. Rechaza temas o payloads con salto de
  // línea o tabulador (romperían el formato del archivo); devuelve 0 en ese caso.
  uint32_t agregar(const std::string& tema, const std::string& payload);

  // Primer mensaje sin enviar, en orden de llegada; nullptr si no hay.
  const MensajeSalida* siguientePendiente() const;
  bool marcarEnVuelo(uint32_t seq, uint16_t packetId);
  // PUBACK recibido: quita el mensaje. Devuelve false si el packetId no era de la cola.
  bool confirmar(uint16_t packetId);
  // Conexión caída: todo vuelve a pendiente.
  void reiniciarEnVuelo();

  size_t tamano() const { return mensajes_.size(); }
  size_t enVuelo() const;
  bool vacia() const { return mensajes_.empty(); }
  uint32_t descartados() const { return descartados_; }

  // Formato: una línea por mensaje "tema\tpayload\n".
  std::string serializar() const;
  // Reemplaza el contenido; ignora líneas mal formadas. Devuelve cuántos cargó.
  size_t deserializar(const std::string& texto);

 private:
  size_t capacidad_;
  std::deque<MensajeSalida> mensajes_;
  uint32_t siguienteSeq_ = 1;
  uint32_t descartados_ = 0;
};

}  // namespace logica
