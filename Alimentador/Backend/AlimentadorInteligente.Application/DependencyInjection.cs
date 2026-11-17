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
        services.AddScoped<IGatewayService, GatewayService>();
        services.AddScoped<IAlimentadorService, AlimentadorService>();
        services.AddScoped<IMascotaService, MascotaService>();
        services.AddScoped<IHorarioService, HorarioService>();
        services.AddScoped<IHistorialService, HistorialService>();
        services.AddScoped<IAlertaService, AlertaService>();
        services.AddScoped<IComandoService, ComandoService>();
        services.AddScoped<IOtaService, OtaService>();
        services.AddScoped<IDispositivoService, DispositivoService>();
        services.AddScoped<IMonitoreoService, MonitoreoService>();

        services.AddScoped<IAdminResumenService, AdminResumenService>();
        services.AddScoped<IAdminUsuarioService, AdminUsuarioService>();
        services.AddScoped<IAdminAlimentadorService, AdminAlimentadorService>();
        services.AddScoped<IAdminEmbebidosService, AdminEmbebidosService>();
        services.AddScoped<IAdminOtaService, AdminOtaService>();
        return services;
    }
}
