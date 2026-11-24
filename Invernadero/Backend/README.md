# Invernadero Inteligente - Backend

Backend en .NET 10 con Clean Architecture para el proyecto Invernadero Inteligente.

## Estructura

```
Backend/
├── InvernaderoInteligente.API
│   ├── Controllers/          # AuthController (login, registro, perfil)
│   ├── Properties/
│   ├── appsettings.json      # Configuración (BD, JWT, Azure)
│   └── Program.cs            # DI, JWT, CORS, DbContext
│
├── InvernaderoInteligente.Application
│   ├── DTOs/                 # LoginRequestDto, RegisterRequestDto, LoginResponseDto, UsuarioDto, SensorDto
│   ├── Interfaces/           # IAuthService (y demás interfaces de servicios)
│   └── Services/             # Servicios de aplicación
│
├── InvernaderoInteligente.Domain
│   └── Entities/             # Usuario, Sensor, Lectura, TipoSensor
│
└── InvernaderoInteligente.Infrastructure
    ├── ExternalServices/     # AuthService (JWT + BCrypt)
    ├── Migrations/           # Migraciones de EF Core
    └── Persistence/          # AppDbContext
```

Dependencias entre proyectos:
- API → Application, Infrastructure
- Infrastructure → Application, Domain
- Application → Domain
- Domain → (ninguno)

## Requisitos

- .NET SDK 10
- SQL Server (o LocalDB)
- Herramientas de EF Core: `dotnet tool install --global dotnet-ef`

## Configuración (`appsettings.json`)

```json
{
  "BaseDatos": {
    "ConnectionString": "Server=localhost;Database=InvernaderoInteligente;Trusted_Connection=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "SecretKey": "clave-secreta-larga",
    "Issuer": "InvernaderoInteligente.API",
    "Audience": "InvernaderoInteligenteApp"
  }
}
```

> Cambia `Jwt:SecretKey` en producción y rellena las secciones de Azure
> (Blob, Bus, CustomVision, FaceAPI) cuando se usen esos servicios.

## Base de datos

```bash
# Crear la base de datos y aplicar la migración inicial
dotnet ef database update --project InvernaderoInteligente.Infrastructure --startup-project InvernaderoInteligente.API

# Crear una nueva migración tras modificar entidades
dotnet ef migrations add NombreDeLaMigracion --project InvernaderoInteligente.Infrastructure --startup-project InvernaderoInteligente.API
```

## Ejecutar

```bash
dotnet run --project InvernaderoInteligente.API
```

## API de Usuario (`/api/auth`)

| Método | Ruta             | Auth  | Descripción                                              |
|--------|------------------|-------|----------------------------------------------------------|
| POST   | `/api/auth/registro` | No    | Crea una cuenta y devuelve token + datos del usuario      |
| POST   | `/api/auth/login`    | No    | Inicia sesión y devuelve token + datos del usuario        |
| GET    | `/api/auth/me`       | Bearer| Perfil del usuario autenticado (desde el token JWT)       |

### POST /api/auth/registro

Cuerpo:

```json
{
  "nombre": "Mariana",
  "correo": "mariana@invernadero.app",
  "contrasena": "clave1234"
}
```

- `201`/`200` → `LoginResponseDto` (token, nombre, correo, expiracion)
- `409` → el correo ya está registrado
- `400` → correo o contraseña faltantes

### POST /api/auth/login

Cuerpo:

```json
{
  "correo": "mariana@invernadero.app",
  "contrasena": "clave1234"
}
```

- `200` → `LoginResponseDto` (token, nombre, correo, expiracion)
- `401` → correo o contraseña incorrectos

### GET /api/auth/me

Cabecera: `Authorization: Bearer <token>`

- `200` → `UsuarioDto` (id_Usuario, nombre, correo, fecha_Registro, rol)
- `401` → token inválido o ausente

### Respuesta de éxito (login/registro)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "nombre": "Mariana",
  "correo": "mariana@invernadero.app",
  "expiracion": "2026-11-12T06:36:27.36Z"
}
```

## Notas técnicas

- Las contraseñas se guardan **hasheadas con BCrypt** (nunca en texto plano).
- El token JWT expira a las **8 horas** y contiene id, correo y rol del usuario.
- `correo` es único en la tabla `Usuarios` (índice único).
- CORS está abierto (`PermitirTodo`) para desarrollo; restríngelo en producción.

Back- pris

- **Custom Vision:** `Application/Interfaces/ICustomVisionService.cs` define el contrato y `DTOs/ImageClassificationDtos.cs` las respuestas. `Application/Services/CustomVisionService.cs` envía el stream binario a la ruta de Prediction API y mapea las predicciones. `ImageClassificationService` primero comprueba y abre el blob y luego solicita la clasificación. El endpoint está en `API/Controllers/ImagesController.cs`. Cambia el endpoint, el modelo de respuesta o el umbral de decisión ahí; credenciales y nombre de iteración vienen de configuración.
- **Bus Services:** `Application/Interfaces/IBusServices.cs`, `DTOs/ComandoDto.cs` y `DTOs/LoteLecturas.cs` definen los contratos JSON. `Application/Services/BusSerivice.cs` publica comandos con TTL de dos minutos. `Infrastructure/BackgroundServices/LecturasWorker.cs` escucha la cola de lecturas y decide completar o enviar a dead-letter. La API de prueba de comandos está en `API/Controllers/CommandsController.cs`; el procesamiento del lote está en `Application/Services/ProcesarLecturasService.cs` (actualmente solo registra el lote; ahí se agrega persistencia o reglas de automatización).
- **Registro de servicios:** `Application/Services/ImageClassificationRegistration.cs` enlaza configuración y registra Blob Storage, el cliente HTTP de Custom Vision y el servicio de clasificación. `API/Program.cs` compone los servicios y habilita el worker solo cuando existe la conexión de lecturas.
- **Persistencia:** el proyecto de dominio contiene `Lectura`, `Sensor` y `TipoSensor`; `Infrastructure/Persistence/AppDbContext.cs` es el punto de partida para persistencia. Actualmente el procesamiento de lecturas no guarda en base de datos.

Al cambiar propiedades de los mensajes, actualiza juntos los DTO, los productores/consumidores y los ejemplos de prueba; los nombres JSON deben coincidir con el formato que envían los dispositivos.

