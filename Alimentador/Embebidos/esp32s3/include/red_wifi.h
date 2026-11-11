#pragma once

// WiFi en modo estación con reconexión y espera exponencial (5 s a 60 s).

namespace red {

void iniciar();
void atender();
bool conectada();

}  // namespace red
