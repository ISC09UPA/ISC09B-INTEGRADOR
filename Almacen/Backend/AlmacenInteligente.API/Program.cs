using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Application.Services;
using AlmacenInteligente.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Cadena de conexión a db-almacen: va en User Secrets (local) o en la configuración del App Service.
// Nunca en appsettings.json ni en el repositorio.
var cadenaConexion = builder.Configuration.GetConnectionString("AlmacenDb");
if (string.IsNullOrWhiteSpace(cadenaConexion))
    throw new InvalidOperationException("Falta la cadena de conexión 'ConnectionStrings:AlmacenDb'. Agrégala en User Secrets.");

builder.Services.AddInfrastructure(cadenaConexion);
builder.Services.AddScoped<IProductoService, ProductoService>();

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

app.UseAuthorization();

app.MapControllers();

app.Run();
