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

        return services;
    }
}
