using CasaDomotica.Application;
using CasaDomotica.Infrastructure.Data;
using CasaDomotica.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CasaDomotica.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Base de datos + servicios de Azure (Custom Vision, Blob Storage, Communication Email y Maps).</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<CustomVisionOptions>(config.GetSection("CustomVision"));
        services.Configure<BlobOptions>(config.GetSection("Blob"));
        services.Configure<EmailOptions>(config.GetSection("Email"));
        services.Configure<MapsOptions>(config.GetSection("Maps"));

        // SQLite por defecto; Azure SQL / SQL Server si Database:Provider = "SqlServer".
        var proveedor = config["Database:Provider"] ?? "Sqlite";
        var conexion = config.GetConnectionString("Default") ?? "Data Source=casalink.db";
        services.AddDbContext<CasaDb>(o =>
        {
            if (proveedor.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
            {
                o.UseSqlServer(conexion);
            }
            else
            {
                o.UseSqlite(conexion);
            }
        });

        services.AddHttpClient<IReconocimientoFacial, CustomVisionService>(c => c.Timeout = TimeSpan.FromSeconds(12));
        services.AddHttpClient<IMapas, MapasService>(c => c.Timeout = TimeSpan.FromSeconds(10));
        services.AddSingleton<IAlmacenFotos, BlobFotosService>();
        services.AddSingleton<IAlertasCorreo, CorreoAlertaService>();
        return services;
    }
}
