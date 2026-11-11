using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace EstacionamientoInteligente.Application;

/// <summary>Registra los servicios de Application. Se llama desde Program.cs con <c>AddApplication()</c>.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICajonesService, CajonesService>();
        services.AddScoped<IVehiculosService, VehiculosService>();
        services.AddScoped<IAlertasService, AlertasService>();
        services.AddScoped<IHistorialService, HistorialService>();
        services.AddScoped<IEstadisticasService, EstadisticasService>();
        services.AddScoped<IProcesadorPasoPluma, ProcesadorPasoPluma>();
        services.AddScoped<IPlumaService, PlumaService>();
        services.AddScoped<IEscanerService, EscanerService>();
        services.AddScoped<ISimulacionService, SimulacionService>();

        return services;
    }
}
