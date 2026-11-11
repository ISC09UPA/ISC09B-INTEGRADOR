#pragma once

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Falta include/secrets.h: copia include/secrets.example.h y llena tus datos"
#endif

#if !defined(WIFI_SSID) || !defined(WIFI_PASS) || !defined(FEEDER_ID) || \
    !defined(GATEWAY_HOST) || !defined(GATEWAY_MQTT_PORT) || !defined(GATEWAY_HTTP_PORT) || \
    !defined(MQTT_USER) || !defined(MQTT_PASS)
#error "secrets.h incompleto: compara con secrets.example.h"
#endif
