using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Infrastructure.Correo;
using AlmacenInteligente.Infrastructure.Fotos;
using AlmacenInteligente.Infrastructure.Persistence;
using AlmacenInteligente.Infrastructure.Repositories;
using AlmacenInteligente.Infrastructure.Seguridad;
using AlmacenInteligente.Infrastructure.Vision;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AlmacenInteligente.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string cadenaConexion)
    {
        // Reintentos: la base serverless tarda unos segundos en "despertar" tras la pausa automática.
        services.AddDbContext<AlmacenDbContext>(opciones =>
            opciones.UseSqlServer(cadenaConexion, sql => sql.EnableRetryOnFailure()));

        services.AddScoped<IProductoRepository, ProductoRepository>();
        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<IMovimientoRepository, MovimientoRepository>();
        services.AddScoped<IEspacioRepository, EspacioRepository>();
        services.AddScoped<ILecturaRepository, LecturaRepository>();
        services.AddScoped<IAlertaRepository, AlertaRepository>();
        services.AddScoped<IPedidoRepository, PedidoRepository>();
        services.AddScoped<IProveedorRepository, ProveedorRepository>();
        services.AddSingleton<IServicioContrasena, ServicioContrasenaBcrypt>();
        return services;
    }

    // Correo al proveedor (Azure Communication Services Email). Solo lo usa la API.
    public static IServiceCollection AddCorreo(this IServiceCollection services, string? cadenaConexion, string? remitente)
    {
        services.AddSingleton<IServicioCorreo>(sp =>
            new ServicioCorreoAcs(cadenaConexion, remitente, sp.GetRequiredService<ILogger<ServicioCorreoAcs>>()));
        return services;
    }

    // Fotos de productos (Azure Blob Storage) e identificación (Azure AI Vision). Solo los usa la API.
    public static IServiceCollection AddFotosYVision(
        this IServiceCollection services,
        string? cadenaStorage, string? contenedor,
        string? endpointVision, string? claveVision, double umbralConfianza)
    {
        services.AddSingleton<IServicioFotos>(sp =>
            new ServicioFotosBlob(cadenaStorage, contenedor, sp.GetRequiredService<ILogger<ServicioFotosBlob>>()));
        services.AddSingleton<IServicioVision>(sp =>
            new ServicioVisionAzure(endpointVision, claveVision, umbralConfianza, sp.GetRequiredService<ILogger<ServicioVisionAzure>>()));
        return services;
    }
}
