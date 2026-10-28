using System.Text.Json.Serialization;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    // Los enums viajan como texto ("Libre", "Carro") y no como números.
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddRouting(o => o.LowercaseUrls = true);
builder.Services.AddOpenApi();

// Para que el front pueda probar desde el navegador o un emulador en desarrollo.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// PENDIENTE (cuando existan Application e Infrastructure):
//   builder.Services.AddApplication();
//   builder.Services.AddInfrastructure(builder.Configuration);
//   JWT + [Authorize(Roles = ...)] en los controllers, SignalR (/hubs/estacionamiento) y Azure Monitor.

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                 // /openapi/v1.json
    app.MapScalarApiReference();      // /scalar  → documentación y pruebas de la API
    app.UseCors();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
