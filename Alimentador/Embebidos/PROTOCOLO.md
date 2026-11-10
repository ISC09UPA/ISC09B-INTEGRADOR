# Protocolo ESP32-S3 ⇄ Raspberry Pi ⇄ Backend

Arquitectura:

```
ESP32-S3 (cámara + modelo + servos + celdas de carga)
   │  WiFi LAN, MQTT (Mosquitto en la Pi, puerto 1883, usuario/clave por alimentador)
   │  HTTP LAN a la Pi (puerto 8080): descarga OTA y subida de fotos dudosas
   ▼
Raspberry Pi (gateway) ── HTTPS ──► Backend .NET  /api/device/*  (X-Device-Id / X-Device-Key)
   cola offline en SQLite                    │
                                             ▼
                                     App (REST + SignalR)
```

- `{id}` = `Codigo` del alimentador (letras, números, `-`, `_`) = `FeederId` del backend.
- Todos los tiempos son **Unix en segundos** (`long`), igual que el backend.
- JSON en camelCase. Nombres de campo idénticos a los DTOs de `DispositivoDtos.cs`.
- Tolvas: `1` = perro, `2` = gato.
- QoS 1 para todo excepto `status` (QoS 1 + retained).

## Temas MQTT

| Tema | Dirección | Retained | Payload |
| --- | --- | --- | --- |
| `feeder/{id}/status` | ESP32 → Pi | sí | `{ "online": true, "hopperDogPct": 72.0, "hopperCatPct": 40.5, "plateDogG": 3.1, "plateCatG": 0.0, "firmware": "1.2.0", "model": "2026.11.1", "reportedAt": 1794350000 }` cada 60 s y en cada cambio relevante. LWT: `{ "online": false }` |
| `feeder/{id}/visit` | ESP32 → Pi | no | `{ "eventId": "uuid", "petId": 3 \| null, "class": "Gato", "confidence": 0.93, "startedAt": s, "endedAt": s, "plateBeforeG": 3.1, "dispensedG": 31.2, "plateAfterG": 5.0 }`. `class` ∈ `Perro`, `Gato`, `Paloma`, `Nada` |
| `feeder/{id}/event` | ESP32 → Pi | no | `{ "eventId": "uuid", "type": "JAM" \| "HOPPER_LOW", "occurredAt": s, "detail": "texto" \| null, "hopper": 1 \| 2 }` |
| `feeder/{id}/config` | Pi → ESP32 | sí | El `ConfigAlimentadorDto` del backend tal cual: `{ "feederId", "version", "minIntervalHours", "timeZone", "pets": [{ "id", "name", "species", "hopper", "rfid", "gramsPerMeal" }], "schedules": [{ "petId", "time": "HH:mm" }] }` |
| `feeder/{id}/cmd` | Pi → ESP32 | no | `{ "id": 15, "type": "dispense", "grams": 30.0, "petId": 3, "hopper": 2 }` o `{ "id": 16, "type": "ota", "target": "firmware" \| "model", "url": "http://<ip-pi>:8080/ota/<archivo>", "sha256": "hex", "version": "1.3.0" }` |
| `feeder/{id}/cmd/result` | ESP32 → Pi | no | `{ "id": 15, "ok": true, "dispensedG": 29.8, "error": null }` |
| `gateway/time` | Pi → ESP32 | sí | `{ "now": s }` cada 60 s (respaldo si no hay NTP) |

El ESP32 guarda en LittleFS lo que no pudo publicar (visitas, eventos, resultados) y lo reenvía al reconectar. La Pi guarda en SQLite lo que no pudo mandar al backend y lo reenvía en orden; usa `eventId` para que el backend descarte duplicados.

## HTTP en la LAN (servidor de la Pi, puerto 8080)

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/ota/<archivo>` | La Pi descarga el artefacto desde la URL SAS del comando, verifica el SHA-256 y lo sirve aquí. El ESP32 lo descarga, vuelve a verificar el SHA-256 y lo instala |
| POST | `/photos?feederId=&eventId=&class=&confidence=&takenAt=` | Body `image/jpeg`. Foto dudosa (confianza baja). La Pi pide la URL SAS a `/api/device/photos`, la sube y confirma con `/api/device/photos/confirm` |
| GET | `/health` | Para que el ESP32 sepa si la Pi responde |

## Flujo OTA

1. Alguien publica un artefacto (`firmware` o `modelo`) en el backend y lo despliega con `POST /api/alimentadores/{id}/ota`.
2. La Pi lo recibe en `GET /api/device/commands` (`type: "ota"`, `url` SAS, `sha256`).
3. La Pi descarga, verifica, guarda en `/var/lib/alimentador/ota/` y publica `feeder/{id}/cmd` con la URL de la LAN.
4. El ESP32 descarga, verifica, instala (firmware: partición OTA y reinicio; modelo: archivo en LittleFS y recarga) y publica `cmd/result`.
5. Tras reiniciar, el ESP32 reporta la versión nueva en `status`; si el firmware nuevo no llega a conectarse a MQTT en 60 s, hace rollback.
6. La Pi manda el resultado a `POST /api/device/commands/{id}/result`.
