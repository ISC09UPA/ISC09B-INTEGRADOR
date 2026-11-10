using System.Text.Json.Serialization;
using EstacionamientoInteligente.API.Middleware;
using EstacionamientoInteligente.Infrastructure.Seguridad;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// JWT: la app manda "Authorization: Bearer <token>" y aquí se valida en cada petición.
// Firma, emisor, audiencia y expiración deben coincidir; si no, responde 401.
var opcionesJwt = builder.Configuration.GetSection(OpcionesJwt.Seccion).Get<OpcionesJwt>() ?? new OpcionesJwt();
builder.Services.Configure<OpcionesJwt>(builder.Configuration.GetSection(OpcionesJwt.Seccion));

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
    });
builder.Services.AddAuthorization();

// PENDIENTE (cuando existan Application e Infrastructure):
//   builder.Services.AddApplication();
//   builder.Services.AddInfrastructure(builder.Configuration);  ← ahí se registra GeneradorToken
//   [Authorize(Roles = ...)] en los controllers, SignalR (/hubs/estacionamiento) y Azure Monitor.

var app = builder.Build();

// Va primero para atrapar las excepciones de todo lo que viene después.
app.UseExceptionHandler();

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

app.Run();
