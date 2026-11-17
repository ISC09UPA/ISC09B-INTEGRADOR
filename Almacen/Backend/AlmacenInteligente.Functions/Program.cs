using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Application.Services;
using AlmacenInteligente.Infrastructure;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

// Microservicios de telemetría del Almacén Inteligente (Azure Functions, modelo aislado):
//   IngestarLecturas  POST /api/lecturas         → cola "movimientos" (Service Bus)
//   ProcesarLectura   cola "movimientos"         → base de datos y, si toca reordenar, cola "alertas-reorden"
//   NotificarAlerta   cola "alertas-reorden"     → registro de la alerta
//   Salud             GET  /api/salud
var builder = FunctionsApplication.CreateBuilder(args);
builder.ConfigureFunctionsWebApplication();

// Misma base que la API. En local: local.settings.json → "ConnectionStrings": { "AlmacenDb": "..." }.
// En Azure: variable de entorno ConnectionStrings__AlmacenDb (igual que en la API).
var cadenaConexion = builder.Configuration.GetConnectionString("AlmacenDb");
if (string.IsNullOrWhiteSpace(cadenaConexion))
    throw new InvalidOperationException(
        "Falta la cadena de conexión ConnectionStrings:AlmacenDb (local.settings.json o variables de entorno).");

builder.Services.AddInfrastructure(cadenaConexion);
builder.Services.AddScoped<ILecturaService, LecturaService>();

builder.Build().Run();
