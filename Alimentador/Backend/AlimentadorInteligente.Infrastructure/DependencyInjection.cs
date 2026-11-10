using AlimentadorInteligente.Application;
using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Infrastructure.BackgroundJobs;
using AlimentadorInteligente.Infrastructure.Notifications;
using AlimentadorInteligente.Infrastructure.Options;
using AlimentadorInteligente.Infrastructure.Persistence;
using AlimentadorInteligente.Infrastructure.Security;
using AlimentadorInteligente.Infrastructure.Storage;
using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlimentadorInteligente.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<JwtOptions>(config.GetSection(JwtOptions.Seccion));
        services.Configure<BlobStorageOptions>(config.GetSection(BlobStorageOptions.Seccion));
        services.Configure<ExpoPushOptions>(config.GetSection(ExpoPushOptions.Seccion));
        services.AddSingleton(config.GetSection(OtaOpciones.Seccion).Get<OtaOpciones>() ?? new OtaOpciones());

        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(config.GetConnectionString("Postgres")));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<ITokenService, TokenService>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();

        // Sin esta configuración solo fallan las fotos y OTA, no el resto de los endpoints de la Pi
        var blob = config.GetSection(BlobStorageOptions.Seccion)[nameof(BlobStorageOptions.ConnectionString)];
        services.AddSingleton(_ => new BlobServiceClient(
            string.IsNullOrWhiteSpace(blob) ? "UseDevelopmentStorage=true" : blob));
        services.AddSingleton<IAlmacenamientoArchivos, BlobStorageService>();

        services.AddHttpClient<IPushService, ExpoPushService>();

        services.AddHostedService<MonitorConexionJob>();
        services.AddHostedService<DeteccionAnomaliasJob>();
        services.AddHostedService<AjusteNocturnoJob>();
        return services;
    }
}
