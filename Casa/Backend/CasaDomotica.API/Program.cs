using System.Text;
using CasaDomotica.API.Hubs;
using CasaDomotica.API.Services;
using CasaDomotica.Application;
using CasaDomotica.Infrastructure;
using CasaDomotica.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Aquí van las llaves de Azure (archivo que no se sube a git).
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Escucha en toda la red local para que el celular y la Raspberry puedan conectarse.
builder.WebHost.UseUrls(builder.Configuration["urls"] ?? "http://0.0.0.0:5107");

var jwtKey = builder.Configuration["Jwt:Key"] ?? "casalink-cambia-esta-clave-por-una-larga-de-32+";
var firma = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddSingleton(firma);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<PuertaEstado>();
builder.Services.AddScoped<Notificador>();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            IssuerSigningKey = firma,
            ValidateIssuer = false,
            ValidateAudience = false
        };

        // SignalR y la imagen del mapa mandan el token en la query string (no pueden llevar cabeceras).
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                var ruta = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(token)
                    && (ruta.StartsWithSegments("/hub") || ruta.StartsWithSegments("/api/mapa/imagen")))
                {
                    context.Token = token;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyHeader()
        .AllowAnyMethod()
        .SetIsOriginAllowed(_ => true)
        .AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    Semilla.Aplicar(scope.ServiceProvider.GetRequiredService<CasaDb>());
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "CasaLink backend funcionando");
app.MapControllers();
app.MapHub<AlertasHub>("/hub/alertas").RequireAuthorization();

// Resumen de qué está conectado.
string Estado(bool ok) => ok ? "listo" : "FALTA CONFIGURAR";
var vision = app.Services.GetRequiredService<IReconocimientoFacial>();
var fotos = app.Services.GetRequiredService<IAlmacenFotos>();
var correo = app.Services.GetRequiredService<IAlertasCorreo>();
var mapas = app.Services.GetRequiredService<IMapas>();
Console.WriteLine();
Console.WriteLine("  CasaLink backend");
Console.WriteLine($"  Base de datos : {builder.Configuration["Database:Provider"] ?? "Sqlite"}");
Console.WriteLine($"  Custom Vision : {Estado(vision.Configurado)}");
Console.WriteLine($"  Blob Storage  : {Estado(fotos.Configurado)}");
Console.WriteLine($"  Correo        : {Estado(correo.Configurado)}");
Console.WriteLine($"  Azure Maps    : {(mapas.Configurado ? "listo" : "sin configurar (opcional)")}");
Console.WriteLine("  Prueba todo en: http://localhost:5107/api/diagnostico");
Console.WriteLine();

app.Run();
