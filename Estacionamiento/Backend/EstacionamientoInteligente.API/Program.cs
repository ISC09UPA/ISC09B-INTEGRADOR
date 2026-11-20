using System.Text.Json.Serialization;
using EstacionamientoInteligente.API.Hubs;
using EstacionamientoInteligente.API.Middleware;
using EstacionamientoInteligente.Application;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Infrastructure;
using EstacionamientoInteligente.Infrastructure.Data;
using EstacionamientoInteligente.Infrastructure.Locales;
using EstacionamientoInteligente.Infrastructure.Seguridad;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    // Los enums viajan como texto ("Libre", "Carro") y no como números.
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddRouting(o => o.LowercaseUrls = true);
builder.Services.AddOpenApi();

// Excepciones del dominio → 400 / 403 / 404 / 409 con formato ProblemDetails.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ManejadorExcepciones>();

// Para que el front pueda probar desde el navegador o un emulador en desarrollo.
// Acepta cualquier origen con credenciales porque el cliente de SignalR del navegador las manda
// (AllowAnyOrigin no se puede combinar con credenciales). Solo se activa en desarrollo.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .SetIsOriginAllowed(_ => true)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// JWT: la app manda "Authorization: Bearer <token>" y aquí se valida en cada petición.
// Firma, emisor, audiencia y expiración deben coincidir; si no, responde 401.
var opcionesJwt = builder.Configuration.GetSection(OpcionesJwt.Seccion).Get<OpcionesJwt>() ?? new OpcionesJwt();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false; // Los claims se leen con sus nombres cortos: sub, name, role.
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = opcionesJwt.Emisor,
            ValidateAudience = true,
            ValidAudience = opcionesJwt.Audiencia,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = opcionesJwt.ObtenerLlave(),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = ClaimesJwt.Nombre,
            RoleClaimType = ClaimesJwt.Rol   // Para [Authorize(Roles = "Administrador")]
        };

        // SignalR: el navegador no puede mandar el encabezado Authorization al abrir el WebSocket,
        // así que para el hub el token llega como ?access_token=...
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = contexto =>
            {
                var token = contexto.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && contexto.HttpContext.Request.Path.StartsWithSegments(EstacionamientoHub.Ruta))
                    contexto.Token = token;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

// Services de Application y lo que usan de Infrastructure (base, DAOs, JWT, fotos, maqueta).
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Tiempo real (CU-27): hub /hubs/estacionamiento. Los enums viajan como texto, igual que en los controllers.
var signalR = builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Con la cadena de Azure SignalR Service las conexiones pasan por Azure; sin ella, SignalR corre dentro de la API.
var cadenaSignalR = builder.Configuration["Azure:SignalR:ConnectionString"];
if (!string.IsNullOrWhiteSpace(cadenaSignalR))
    signalR.AddAzureSignalR(cadenaSignalR);

builder.Services.AddSingleton<INotificadorTiempoReal, NotificadorSignalR>();

var app = builder.Build();

// En desarrollo (SQLite) crea la base, las tablas y los 4 cajones si faltan; siempre crea el administrador si no existe.
await InicializadorBaseDatos.InicializarAsync(
    app.Services,
    crearTablas: app.Configuration.GetValue<bool>("BaseDatos:CrearTablasAlArrancar"));

// Va primero para atrapar las excepciones de todo lo que viene después.
app.UseExceptionHandler();

// Fotos guardadas en la compu mientras no exista Blob Storage (ver AlmacenFotosLocal).
var carpetaFotos = Path.Combine(app.Environment.ContentRootPath, AlmacenFotosLocal.Carpeta);
Directory.CreateDirectory(carpetaFotos);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(carpetaFotos),
    RequestPath = AlmacenFotosLocal.RutaPublica
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                 // /openapi/v1.json
    app.MapScalarApiReference();      // /scalar  → documentación y pruebas de la API
    app.UseCors();
}

app.UseHttpsRedirection();

app.UseAuthentication();   // ¿Quién eres? (lee y valida el token)
app.UseAuthorization();    // ¿Puedes hacer esto? (revisa el rol)

app.MapControllers();
app.MapHub<EstacionamientoHub>(EstacionamientoHub.Ruta);

app.Run();
