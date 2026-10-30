# Backend · Estacionamiento Inteligente

Propuesta de estructura y endpoints del backend en .NET 10 con arquitectura limpia. Consume servicios de Azure y se comunica con la maqueta (Raspberry Pi) por Service Bus.

## Avance

| Parte | Estado |
|---|---|
| Domain (modelos, DTOs, `Placa`, `ReglasAcceso`) | ✅ Hecho |
| Estructura de carpetas según el profesor | ✅ Hecho |
| Contrato de la API (controllers + DTOs) | ✅ Hecho, con **datos de ejemplo** (`API/Ejemplos/DatosEjemplo.cs`) |
| Configuración para las llaves de Azure | ✅ `appsettings.json` (vacío) + `.env.example`; las llena Carlos |
| Domain/DAOs (interfaces de acceso a datos + `IUnidadDeTrabajo`) | ✅ Hecho |
| Application/Interfaces (9 servicios + `IProcesadorPasoPluma` + puertos en `Externos/`) | ✅ Hecho |
| Application/Services | ⏳ Pendiente |
| Infrastructure (DAOs, SQL, Azure, JWT) | ⏳ Pendiente |
| Login real con JWT y roles, SignalR | ⏳ Pendiente |

**Para el front:** con la API corriendo (`dotnet run --project EstacionamientoInteligente.API`), la documentación interactiva está en `http://localhost:5141/scalar` y el JSON de OpenAPI en `/openapi/v1.json`. Los enums viajan como texto (`"Libre"`, `"Carro"`). Las fechas reales se devolverán en UTC (terminan en `Z`), así que la app debe pasarlas a hora local. Por ahora el login devuelve un token de ejemplo y ningún endpoint lo valida.

**Dónde va cada cosa:** endpoints en `EstacionamientoInteligente.API/Controllers/`, DTOs en `EstacionamientoInteligente.Domain/DTOs/<Módulo>Dtos.cs`, modelos en `EstacionamientoInteligente.Domain/Models/`.

---

## 1. Capas y dependencias

Basada en la estructura que pidió el profesor de back (API → Controllers, Application → Services/Interfaces, Domain → Models/DTOs/DAOs, Infrastructure → SQL y Azure), respetando la arquitectura limpia.

```
API  ──►  Application  ──►  Domain
 │                            ▲
 └──►  Infrastructure ────────┘
```

- **Domain**: no depende de nada. Tiene los modelos, los DTOs y las *interfaces* de los DAOs.
- **Application**: depende solo de Domain. Define las interfaces de los servicios y las implementa.
- **Infrastructure**: implementa los DAOs (queries a Azure SQL) y lo que se conecta con Azure.
- **API**: expone los endpoints y SignalR. Usa Infrastructure solo para registrar dependencias.

Flujo de una petición: `Controller → IXxxService → XxxService → IXxxDao → XxxDao → Azure SQL`.

---

## 2. Estructura de carpetas

```
Backend/
├─ EstacionamientoInteligente.API/             ← endpoints
│  ├─ Controllers/          Auth, Cajones, Historial, Estadisticas, Vehiculos,
│  │                        Escaner, Pluma, Alertas, Simulacion
│  ├─ Ejemplos/             DatosEjemplo (temporal: se borra cuando existan los Services)
│  ├─ Hubs/                 EstacionamientoHub (SignalR)
│  ├─ Program.cs
│  ├─ appsettings.json
│  └─ EstacionamientoInteligente.API.http   pruebas de todos los endpoints
│
├─ EstacionamientoInteligente.Application/     ← casos de uso
│  ├─ Interfaces/           IAuthService, ICajonesService, IHistorialService,
│  │                        IEstadisticasService, IVehiculosService, IEscanerService,
│  │                        IPlumaService, IAlertasService, ISimulacionService
│  │                        + las de servicios externos: IAlmacenFotos (Blob),
│  │                        ILectorPlacas (Vision), IComandosMaqueta (Service Bus),
│  │                        INotificadorTiempoReal (SignalR), IGeneradorToken, IHasherContrasenas
│  ├─ Services/             AuthService, CajonesService, … (uno por interfaz)
│  │                        ProcesarPasoPlumaService (lógica principal de entrada y salida)
│  └─ DependencyInjection.cs
│
├─ EstacionamientoInteligente.Domain/          ← reglas del negocio, sin dependencias
│  ├─ Models/         Usuario, Vehiculo, Cajon, Acceso, Alerta, EventoSensor
│  ├─ DTOs/           AuthDtos, CajonesDtos, HistorialDtos, … (lo que entra y sale de la API)
│  ├─ DAOs/           IUsuarioDao, IVehiculoDao, ICajonDao, IAccesoDao,
│  │                  IAlertaDao, IEventoSensorDao (solo interfaces)
│  ├─ Enums/          RolUsuario, TipoVehiculo, EstadoVehiculo, EstadoCajon,
│  │                  TipoPaso (Entrada/Salida), AccionPluma (Abrir/Negar), TipoAlerta
│  ├─ ValueObjects/   Placa (normaliza "abc 123a" → "ABC-123-A" y la valida)
│  ├─ Servicios/      ReglasAcceso (¿entrada o salida?, ¿hay cupo?, lecturas repetidas en 10 s)
│  └─ Comun/          EntidadBase, ExcepcionDominio
│
├─ EstacionamientoInteligente.Infrastructure/  ← SQL y todo lo que se conecta con Azure
│  ├─ Data/                 EstacionamientoDbContext (conexión a Azure SQL), semilla de datos
│  ├─ DAOs/                 UsuarioDao, VehiculoDao, CajonDao, … (implementan Domain/DAOs con los queries)
│  ├─ Scripts/              archivos .sql (crear tablas, datos iniciales)
│  ├─ Azure/                Blob, Computer Vision, Service Bus, Monitor
│  └─ DependencyInjection.cs
│
├─ ESTRUCTURA-BACKEND.md
└─ .gitignore           ← bin/ y obj/ (solo de esta carpeta)
```

---

## 3. Modelo de datos

| Entidad | Campos principales | Para qué sirve |
|---|---|---|
| **Usuario** | Id, Nombre, Correo, ContrasenaHash, Rol (Administrador o Usuario), FechaRegistro | Login y permisos |
| **Vehiculo** | Id, Placa (puede ser "no legible"), Tipo (Carro, Camioneta, Moto, Camion, Desconocido), UsuarioId?, Estado (Alta o Baja), FechaAlta | Registro de placas |
| **Cajon** | Id, Numero (1–4), Estado (Libre u Ocupado), UltimoCambio | Mapa en tiempo real |
| **Acceso** | Id, VehiculoId, CajonId?, Estacionado, HoraEntrada, HoraSalida?, FotoEntrada, FotoSalida?, ConfianzaOcr, Origen (Maqueta o Escaner) | Historial, estancias y estadísticas |
| **Alerta** | Id, Tipo (EntradaNegada, PlacaNoLegible, CajonSinSalida), Mensaje, Placa?, Foto?, Fecha, Atendida | Avisos al administrador |
| **EventoSensor** | Id, Dispositivo, Tipo (Cajon, Pluma), Valor, Fecha | Auditoría de la maqueta y estado de la pluma |

La duración de una estancia no se guarda: se calcula como `HoraSalida - HoraEntrada`, o con la hora actual si el auto sigue dentro.

---

## 4. Endpoints REST

Prefijo `/api`. Autenticación con JWT (`Authorization: Bearer <token>`).
Roles: 👤 usuario · 🛠 administrador · ✅ ambos.

### Auth
| Método y ruta | Rol | Descripción |
|---|---|---|
| `POST /api/auth/login` | público | Pantalla 1. Recibe `{correo, contrasena, rol}` y devuelve `{token, nombre, rol}`. Si el rol elegido no es el del usuario, responde error. |
| `POST /api/auth/registro` | público | Crea una cuenta con rol usuario. |
| `GET /api/auth/yo` | ✅ | Datos del usuario y sus placas ("Hola, Vane" y Perfil). |

### Cajones
| Método y ruta | Rol | Descripción |
|---|---|---|
| `GET /api/cajones` | ✅ | Pantalla 2 (mapa): los 4 cajones con estado y `esMio`, libres/total y estado de la pluma. |
| `GET /api/cajones/{numero}` | ✅ | Pantalla 3 (detalle): foto, placa, tipo, hora de entrada, estancia y hora de salida. El usuario solo ve el detalle de su propio auto; el administrador ve todos. |

### Historial (usuario)
| Método y ruta | Rol | Descripción |
|---|---|---|
| `GET /api/historial/actual` | 👤 | Tarjeta "Tu auto está en el cajón 3". |
| `GET /api/historial?periodo=semana\|mes\|todo` | 👤 | Pantalla 4: lista de entradas y salidas con su duración. |
| `GET /api/historial/resumen?mes=2026-10` | 👤 | Visitas del mes, estancia promedio y cajón frecuente. |

### Estadísticas (admin)
| Método y ruta | Rol | Descripción |
|---|---|---|
| `GET /api/estadisticas/panel?fecha=2026-10-27` | 🛠 | Pantalla 5: ocupación actual, entradas del día, estancia promedio y cajón más usado. |
| `GET /api/estadisticas/ocupacion-por-hora?fecha=` | 🛠 | Datos de la gráfica de barras. |
| `GET /api/estadisticas/uso-por-cajon?desde=&hasta=` | 🛠 | Usos por cajón. |

### Vehículos (admin)
| Método y ruta | Rol | Descripción |
|---|---|---|
| `GET /api/vehiculos?placa=&filtro=todos\|dentro\|fuera\|baja` | 🛠 | Pantalla 6: lista con búsqueda y filtros. |
| `POST /api/vehiculos` | 🛠 | Dar de alta: `{placa, tipo, correoUsuario?}`. |
| `PATCH /api/vehiculos/{id}/baja` | 🛠 | Dar de baja. |
| `PATCH /api/vehiculos/{id}/reactivar` | 🛠 | Reactivar. |
| `PATCH /api/vehiculos/{id}/placa` | 🛠 | Corregir una "placa no legible": `{placa}`. |

### Escáner y pluma (admin)
| Método y ruta | Rol | Descripción |
|---|---|---|
| `POST /api/escaner/analizar` (multipart, `foto`) | 🛠 | Pantalla 7: sube la foto a Blob, lee la placa con Computer Vision y el tipo con Custom Vision. Devuelve `{placa, confianza, tipo, fotoBlob, seRegistraraComo: entrada\|salida, entradaAbierta?}`. **No registra nada.** |
| `POST /api/escaner/registrar` | 🛠 | Confirma el paso con `{placa, tipo, fotoBlob}`; la placa se puede editar. Aplica las mismas reglas que la maqueta y, si procede, abre la pluma. |
| `POST /api/pluma/abrir` | 🛠 | Apertura manual: abre sin validar y queda registrado quién la abrió. |
| `GET /api/pluma/estado` | ✅ | `{abierta, ultimoCambio}`. |

### Alertas (admin)
| Método y ruta | Rol | Descripción |
|---|---|---|
| `GET /api/alertas?pendientes=true` | 🛠 | "Entrada negada · 11:05" y las demás alertas. |
| `PATCH /api/alertas/{id}/atender` | 🛠 | Marca la alerta como atendida. |

### Simulación (solo en el entorno Development)
| Método y ruta | Rol | Descripción |
|---|---|---|
| `POST /api/simulacion/vehiculo-en-pluma` | 🛠 | `{placa, tipo}`: simula que llegó un auto, sin cámara ni Service Bus. |
| `POST /api/simulacion/cajon` | 🛠 | `{numero, ocupado}`: simula un sensor IR. |

---

## 5. Tiempo real (SignalR)

El hub está en `/hubs/estacionamiento` y pide JWT (por query string `access_token`). Los administradores se unen al grupo `administradores`.

| Evento | Quién lo recibe | Contenido |
|---|---|---|
| `CajonActualizado` | todos | `{numero, estado, libres, total}` |
| `PlumaActualizada` | todos | `{abierta, fecha}` |
| `AccesoRegistrado` | admins y el dueño del auto | `{tipo, placa, cajon, hora}` |
| `AlertaCreada` | admins | `{id, tipo, mensaje, fecha}` |

---

## 6. Raspberry ↔ backend (Service Bus)

La Raspberry no usa la API HTTP. Sube la foto a Blob Storage y manda por Service Bus solo el nombre del archivo.

| Cola | Dirección | Mensaje (`Subject`) | Contenido |
|---|---|---|---|
| `maqueta-eventos` | Pi → backend | `cajon.cambio` | `{cajon, ocupado, fecha}` |
| | | `pluma.vehiculo` | `{solicitudId, fotoBlob, fecha}` |
| | | `pluma.estado` | `{abierta, fecha}` |
| `maqueta-comandos` | backend → Pi | `pluma.respuesta` | `{solicitudId, accion: abrir\|negar, tipo: entrada\|salida, placa}` |
| | | `pluma.abrir` | `{motivo}` (apertura manual) |

`solicitudId` viaja también como `CorrelationId`. Así la Pi sabe a qué foto corresponde cada respuesta.

---

## 7. Reglas de entrada y salida (`ReglasAcceso`)

| Situación | Qué hace el sistema |
|---|---|
| La placa tiene una entrada abierta | Es una **salida**: registra la salida y abre. No pide cajones libres. |
| La placa no tiene entrada abierta | Es una **entrada**: abre solo si hay un cajón libre, sin importar la placa. |
| La misma placa se lee varias veces en 10 s | Ignora las lecturas repetidas. |
| La placa no se lee bien | Se registra como entrada con "placa no legible", abre si hay lugar y crea una alerta para corregirla. |
| Estacionamiento lleno | Niega la entrada, guarda la foto y crea la alerta `EntradaNegada`. |
| Un sensor cambia a ocupado | Asigna el cajón al acceso abierto más reciente que todavía no esté estacionado. |
| Un sensor cambia a libre | El acceso sigue abierto, marcado como "no estacionado", porque el auto puede estar cambiando de cajón. |

---

## 8. Servicios de Azure y su uso

| Servicio | Dónde se usa | Si no está configurado |
|---|---|---|
| Azure SQL Database | `Persistencia/` (EF Core) | Se usa LocalDB en desarrollo. |
| Blob Storage | `Azure/Blob/` | Las fotos se guardan en una carpeta local. |
| Computer Vision (Read/OCR) | `Azure/ComputerVision/` | La placa se marca como "no legible". |
| Custom Vision | `Azure/CustomVision/`, por HTTP (el SDK está obsoleto) | El tipo queda como `Desconocido`. |
| Service Bus | `Azure/ServiceBus/` | El consumidor no arranca y los comandos solo se escriben en el log. |
| Azure SignalR Service | `Program.cs` (`AddAzureSignalR`) | Se usa SignalR local. |
| Azure Monitor | `Azure/Monitor/` (OpenTelemetry) | Las métricas no se exportan. |

**Estadísticas:** las gráficas de la app se calculan con la base de datos. Las mismas métricas (cajones ocupados, entradas, entradas negadas) se envían a Azure Monitor para el dashboard del portal.

---

## 9. Decisiones por confirmar

1. Azure SQL + EF Core (LocalDB en desarrollo).
2. Login con JWT propio y contraseñas con BCrypt.
3. Estadísticas calculadas desde la base de datos; las métricas también se mandan a Azure Monitor.
4. Implementaciones simuladas cuando falta la configuración de Azure.
5. ¿Se queda el registro público (`POST /api/auth/registro`)?
6. ¿Se quedan los endpoints de simulación?
