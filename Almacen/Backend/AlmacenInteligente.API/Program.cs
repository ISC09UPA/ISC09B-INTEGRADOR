using System.Text;
using AlmacenInteligente.API.Seguridad;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Application.Services;
using AlmacenInteligente.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
