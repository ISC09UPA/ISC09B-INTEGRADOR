# Alimentador Inteligente — Backend

API en .NET 10 que da servicio a la app (React Native) y a la Raspberry Pi de cada alimentador.

**Diseño actual:** un dispensador, plato y báscula para el perro (tolva 1) y otros para el gato (tolva 2). La paloma ya no forma parte del alimentador.

## Estructura

| Proyecto | Contenido |
| --- | --- |
| `AlimentadorInteligente.Domain` | Entidades, enums y reglas puras (cálculo de ración y ajuste gradual) |
| `AlimentadorInteligente.Application` | DTOs, interfaces y servicios de negocio, validadores (FluentValidation), excepciones |
| `AlimentadorInteligente.Infrastructure` | EF Core + PostgreSQL, JWT, hash de contraseñas, Blob Storage (SAS), push de Expo, tareas programadas |
| `AlimentadorInteligente.API` | Controladores, autenticación, manejo global de errores, hub de SignalR, OpenAPI |
| `AlimentadorInteligente.Tests` | Pruebas de dominio y de servicios con EF Core en memoria |

Dependencias: `API → Application, Infrastructure`; `Infrastructure → Application → Domain`.

## Requisitos

- .NET SDK 10 (con el targeting pack de ASP.NET Core)
- PostgreSQL 15+ (`docker compose up -d` levanta uno para desarrollo)
- Azurite o una cuenta de Azure Storage (solo para fotos dudosas y OTA), con los contenedores `fotos-dudosas` y `ota` ya creados
- `dotnet-ef` (`dotnet tool install -g dotnet-ef`)

## Configuración

Los secretos **no** van en Git (RNF-07). En desarrollo se usan user-secrets:

```bash
cd AlimentadorInteligente.API
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "<clave aleatoria de al menos 32 caracteres>"
dotnet user-secrets set "ConnectionStrings:Postgres" "Host=localhost;Database=alimentador;Username=postgres;Password=<...>"
dotnet user-secrets set "BlobStorage:ConnectionString" "<cadena de conexión con AccountKey>"
```

En Azure App Service se configuran como variables de entorno (`Jwt__Key`, `ConnectionStrings__Postgres`, `BlobStorage__ConnectionString`).

## Ejecutar

```bash
docker compose up -d
dotnet ef database update -p AlimentadorInteligente.Infrastructure -s AlimentadorInteligente.API
dotnet run --project AlimentadorInteligente.API
dotnet test
```

- Documentación interactiva (solo en Development): `http://localhost:5126/scalar/v1`
- OpenAPI: `http://localhost:5126/openapi/v1.json`
- Ejemplos de peticiones: `AlimentadorInteligente.API/AlimentadorInteligente.API.http`

Nueva migración:

```bash
dotnet ef migrations add <Nombre> -p AlimentadorInteligente.Infrastructure -s AlimentadorInteligente.API -o Persistence/Migrations
```

## Autenticación

| Cliente | Mecanismo |
| --- | --- |
| App | `Authorization: Bearer <accessToken>` (15 min) + refresh token rotativo (30 días) en `/api/auth/refresh` |
| Raspberry Pi | Encabezados `X-Device-Id` y `X-Device-Key`; la clave se guarda como hash SHA-256 en `Gateways` |
| SignalR | `/hubs/alimentador?access_token=<accessToken>` |

Roles por alimentador (RF-19): **Dueño** configura todo; **Cuidador** consulta y dispensa manualmente.

Orden de alta: crear la cuenta, registrar la Pi con `POST /api/gateways` (la clave solo se muestra esa vez) y crear el alimentador con su `gatewayDeviceId`. Solo quien registró una Pi puede ligarle alimentadores.

## Endpoints

### App

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/registro`, `/login`, `/refresh`, `/logout` | Cuenta y tokens |
| PUT | `/api/auth/push-token` | Token de Expo para notificaciones |
| GET/POST | `/api/gateways`, POST `/api/gateways/{id}/regenerar-clave` | Raspberry Pi del usuario y su clave |
| GET/POST | `/api/alimentadores` | Mis alimentadores / registrar uno (quien lo crea queda como Dueño) |
| GET/PUT | `/api/alimentadores/{id}` | Detalle con estado (tolvas y platos de perro y gato, conexión, última sincronización) |
| GET/POST/PUT/DELETE | `/api/alimentadores/{id}/miembros[/{usuarioId}]` | Usuarios y roles |
| GET/POST | `/api/alimentadores/{id}/mascotas` | Mascotas (máximo 3) con ración recomendada |
| GET/PUT/DELETE | `/api/mascotas/{id}` | Detalle de mascota; DELETE es baja lógica y conserva el historial |
| GET | `/api/mascotas/{id}/visitas?desde&hasta` | Historial |
| GET | `/api/mascotas/{id}/consumo?desde&hasta` | Ración recomendada vs. real por día |
| GET/POST | `/api/alimentadores/{id}/horarios`, PUT/DELETE `/api/horarios/{id}` | Horarios |
| GET | `/api/alimentadores/{id}/alertas?soloNoLeidas` | Alertas; PUT `/api/alertas/{id}/leida` |
| POST | `/api/alimentadores/{id}/dispensar` | Dispensado manual con `mascotaId` o `tolva` (202; el resultado llega por SignalR) |
| GET | `/api/alimentadores/{id}/comandos` | Últimos comandos |
| GET | `/api/ota/artefactos` | Versiones de firmware y modelo |
| POST | `/api/alimentadores/{id}/ota` | Lanzar una actualización (solo Dueño) |

### Raspberry Pi (`/api/device`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `config?version=N` | Configuración de los alimentadores del gateway; 204 si nada cambió |
| POST | `heartbeat` | Estado de la Pi y de cada ESP32; `offlineSince` en el primero tras volver internet |
| POST | `sync-complete` | La Pi terminó de vaciar su cola; se reanudan las alertas |
| POST | `visits` | Lote de visitas; idempotente por `eventId`. Responde `recibidos`, `duplicados` y `rechazados` |
| POST | `events` | Lote de eventos `JAM` y `HOPPER_LOW` con `hopper` (1 perro, 2 gato) |
| GET | `commands` | Comandos pendientes (los dispensados con más de 2 min se marcan vencidos) |
| POST | `commands/{id}/result` | Resultado del comando |
| POST | `photos` | URL SAS para subir una foto dudosa a Blob Storage |
| POST | `photos/confirm` | Confirma que la foto ya se subió |

`GET /health` responde sin autenticación; la Pi lo usa para saber si hay internet.

### Tiempo real (SignalR)

Hub en `/hubs/alimentador`. La app llama `UnirseAlimentador(id)` y recibe:
`VisitaRegistrada`, `AlertaCreada`, `ComandoActualizado`, `EstadoAlimentador`.

## Tareas programadas

| Tarea | Frecuencia | Qué hace |
| --- | --- | --- |
| `MonitorConexionJob` | 1 min | Alerta si la Pi o el ESP32 llevan 30 min sin reportar (una sola vez) y cierra comandos sin respuesta |
| `DeteccionAnomaliasJob` | 15 min | No ha comido (12 h) y baja de apetito; se omite si la Pi no reporta o sigue sincronizando |
| `AjusteNocturnoJob` | 1 h | Ajuste de ración ±5 % con los 3 días anteriores, máximo ±15 %; idempotente por día |

Los días se calculan en la zona horaria de cada alimentador (`America/Mexico_City` por defecto).

## Pendientes

- Publicar artefactos OTA: por ahora se sube el archivo al contenedor `ota` y se inserta a mano en `ArtefactosOta`.
- Revisar las fotos dudosas y borrarlas después de reentrenar (RNF-10).
- Guardar la ración recomendada de cada día; hoy la gráfica usa la actual para todo el rango.
- Limpiar tokens de Expo inválidos.
