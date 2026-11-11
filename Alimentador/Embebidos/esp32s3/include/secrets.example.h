#pragma once

// Copia este archivo como include/secrets.h y llena los valores reales.
// secrets.h está en .gitignore: nunca lo subas al repositorio.

#define WIFI_SSID "MiRed"
#define WIFI_PASS "clave-wifi"

// Codigo del alimentador en el backend (letras, números, '-' y '_'). Es el {id} de los temas MQTT.
#define FEEDER_ID "ALIM-001"

// Raspberry Pi (gateway): Mosquitto y servidor HTTP de la LAN.
#define GATEWAY_HOST "192.168.1.50"
#define GATEWAY_MQTT_PORT 1883
#define GATEWAY_HTTP_PORT 8080

// Usuario y clave de este alimentador en Mosquitto.
#define MQTT_USER "ALIM-001"
#define MQTT_PASS "clave-mqtt"
