using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Application.Services;
using System.Globalization;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace AlimentadorInteligente.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        ValidatorOptions.Global.LanguageManager.Culture = new CultureInfo("es");
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IAccesoAlimentador, AccesoAlimentador>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAlimentadorService, AlimentadorService>();
        services.AddScoped<IMascotaService, MascotaService>();
        services.AddScoped<IHorarioService, HorarioService>();
        services.AddScoped<IHistorialService, HistorialService>();
        services.AddScoped<IAlertaService, AlertaService>();
        services.AddScoped<IComandoService, ComandoService>();
        services.AddScoped<IDispositivoService, DispositivoService>();
        services.AddScoped<IMonitoreoService, MonitoreoService>();
        return services;
    }
}
