#include "logica/cola_salida.h"

namespace logica {

namespace {

bool textoSeguro(const std::string& texto) {
  return texto.find_first_of("\t\r\n") == std::string::npos;
}

}  // namespace

uint32_t ColaSalida::agregar(const std::string& tema, const std::string& payload) {
  if (tema.empty() || !textoSeguro(tema) || !textoSeguro(payload) || capacidad_ == 0) return 0;
  while (mensajes_.size() >= capacidad_) {
    mensajes_.pop_front();
    descartados_++;
  }
  MensajeSalida m;
  m.seq = siguienteSeq_++;
  if (siguienteSeq_ == 0) siguienteSeq_ = 1;
  m.tema = tema;
  m.payload = payload;
  mensajes_.push_back(m);
  return m.seq;
}

const MensajeSalida* ColaSalida::siguientePendiente() const {
  for (const MensajeSalida& m : mensajes_) {
    if (m.packetId == 0) return &m;
  }
  return nullptr;
}

bool ColaSalida::marcarEnVuelo(uint32_t seq, uint16_t packetId) {
  if (packetId == 0) return false;
  for (MensajeSalida& m : mensajes_) {
    if (m.seq == seq) {
      m.packetId = packetId;
      return true;
    }
  }
  return false;
}

bool ColaSalida::confirmar(uint16_t packetId) {
  if (packetId == 0) return false;
  for (auto it = mensajes_.begin(); it != mensajes_.end(); ++it) {
    if (it->packetId == packetId) {
      mensajes_.erase(it);
      return true;
    }
  }
  return false;
}

void ColaSalida::reiniciarEnVuelo() {
  for (MensajeSalida& m : mensajes_) m.packetId = 0;
}

size_t ColaSalida::enVuelo() const {
  size_t n = 0;
  for (const MensajeSalida& m : mensajes_) {
    if (m.packetId != 0) n++;
  }
  return n;
}

std::string ColaSalida::serializar() const {
  std::string salida;
  for (const MensajeSalida& m : mensajes_) {
    salida += m.tema;
    salida += '\t';
    salida += m.payload;
    salida += '\n';
  }
  return salida;
}

size_t ColaSalida::deserializar(const std::string& texto) {
  mensajes_.clear();
  size_t inicio = 0;
  while (inicio < texto.size()) {
    size_t fin = texto.find('\n', inicio);
    // Una última línea sin '\n' quedó a medias al escribir: se ignora.
    if (fin == std::string::npos) break;
    std::string linea = texto.substr(inicio, fin - inicio);
    inicio = fin + 1;

    size_t tab = linea.find('\t');
    if (tab == std::string::npos || tab == 0) continue;
    agregar(linea.substr(0, tab), linea.substr(tab + 1));
  }
  return mensajes_.size();
}

}  // namespace logica
