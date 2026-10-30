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

        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(config.GetConnectionString("Postgres")));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<ITokenService, TokenService>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();

        services.AddSingleton(_ => new BlobServiceClient(
            config.GetSection(BlobStorageOptions.Seccion)[nameof(BlobStorageOptions.ConnectionString)]
            ?? "UseDevelopmentStorage=true"));
        services.AddSingleton<IAlmacenamientoArchivos, BlobStorageService>();

        services.AddHttpClient<IPushService, ExpoPushService>();

        services.AddHostedService<MonitorConexionJob>();
        services.AddHostedService<DeteccionAnomaliasJob>();
        services.AddHostedService<AjusteNocturnoJob>();
        return services;
    }
}
