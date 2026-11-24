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
