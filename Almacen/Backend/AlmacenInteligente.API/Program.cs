using System.Text;
using AlmacenInteligente.API.Seguridad;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Application.Services;
using AlmacenInteligente.Infrastructure;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Cadena de conexión a db-almacen: va en User Secrets (local) o en la configuración del App Service.
// Nunca en appsettings.json ni en el repositorio.
var cadenaConexion = builder.Configuration.GetConnectionString("AlmacenDb");
if (string.IsNullOrWhiteSpace(cadenaConexion))
    throw new InvalidOperationException("Falta la cadena de conexión 'ConnectionStrings:AlmacenDb'. Agrégala en User Secrets.");

// Llave para firmar los tokens: también va en User Secrets (local) o en la configuración del App Service.
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOpciones>() ?? new JwtOpciones();
if (Encoding.UTF8.GetByteCount(jwt.Key ?? string.Empty) < 32)
    throw new InvalidOperationException("Falta 'Jwt:Key' o tiene menos de 32 caracteres. Agrégala en User Secrets.");

builder.Services.AddInfrastructure(cadenaConexion);
builder.Services.AddScoped<IProductoService, ProductoService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMovimientoService, MovimientoService>();
builder.Services.AddScoped<IEspacioService, EspacioService>();
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<IGeneradorToken, GeneradorTokenJwt>();

// Login con JWT. Los errores 401/403 usan el mismo formato { "error": "mensaje legible" } del resto de la API.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        // Se usan los nombres de claim tal como vienen en el token (sub, name, role).
        opciones.MapInboundClaims = false;

        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = TiposClaim.Rol,
            NameClaimType = TiposClaim.Usuario
        };

        opciones.Events = new JwtBearerEvents
        {
            OnChallenge = async contexto =>
            {
                contexto.HandleResponse();
                contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await contexto.Response.WriteAsJsonAsync(new { error = "Necesitas iniciar sesión." });
            },
            OnForbidden = async contexto =>
            {
                contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
                await contexto.Response.WriteAsJsonAsync(new { error = "No tienes permiso para esta acción." });
            }
        };
    });
builder.Services.AddAuthorization();

// La app usa token en el encabezado (no cookies), así que se permite cualquier origen (Expo web / pruebas).
builder.Services.AddCors(opciones =>
    opciones.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// Cuerpos inválidos (JSON mal formado, campos faltantes) también responden { "error": "mensaje legible" }.
builder.Services.AddControllers().ConfigureApiBehaviorOptions(opciones =>
    opciones.InvalidModelStateResponseFactory = contexto =>
    {
        var campos = contexto.ModelState
            .Where(c => c.Value is { Errors.Count: > 0 })
            .Select(c => string.IsNullOrEmpty(c.Key) ? "cuerpo" : c.Key.TrimStart('$', '.'))
            .Distinct();
        return new BadRequestObjectResult(new { error = $"Datos inválidos o incompletos en: {string.Join(", ", campos)}." });
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// GET api/salud — sin sesión. Sirve para el health check del App Service y para "despertar" la base serverless
// antes de presentar (la primera llamada puede tardar ~1 minuto).
app.MapGet("/api/salud", async (AlmacenDbContext db, CancellationToken ct) =>
{
    var baseDatos = await db.Database.CanConnectAsync(ct);
    return Results.Ok(new { api = "ok", baseDatos = baseDatos ? "ok" : "sin conexión", horaUtc = DateTime.UtcNow });
}).AllowAnonymous();

app.Run();
