#pragma once

// Actualizaciones por aire.
//
// Firmware: se descarga de la Pi a la partición OTA libre calculando el SHA-256 al vuelo; si
// coincide se marca para arrancar y se reinicia. El firmware nuevo queda "en prueba": si no se
// conecta a MQTT en OTA_VALIDACION_MS (o se reinicia OTA_ARRANQUES_MAX veces) vuelve al anterior.
// Al conectarse llama a esp_ota_mark_app_valid_cancel_rollback() y publica el cmd/result.
//
// Modelo: se descarga a /model.tmp, se verifica, reemplaza a /model.tflite y se recarga. Si el
// modelo nuevo no carga se restaura el anterior.

#include <string>

#include "logica/protocolo.h"

namespace ota {

void alArrancar();
void alConectarMqtt();
void atender();
bool enPrueba();

// Bloquea mientras descarga. Si todo sale bien reinicia y no regresa.
bool actualizarFirmware(const logica::Comando& cmd, std::string& error);
bool actualizarModelo(const logica::Comando& cmd, std::string& error);

}  // namespace ota
