using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Infrastructure.DAOs;
using EstacionamientoInteligente.Infrastructure.Data;
using EstacionamientoInteligente.Infrastructure.Locales;
using EstacionamientoInteligente.Infrastructure.Seguridad;
using EstacionamientoInteligente.Infrastructure.Tareas;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace EstacionamientoInteligente.Infrastructure;

/// <summary>
/// Registra todo lo de Infrastructure: base de datos, DAOs, seguridad y servicios externos.
/// Se llama desde Program.cs con <c>AddInfrastructure(builder.Configuration)</c>.
/// </summary>
public static class DependencyInjection
{
    public const string NombreCadenaConexion = "EstacionamientoDb";
    public const string ClaveProveedor = "BaseDatos:Proveedor";

    /// <summary>True si la configuración pide SQLite (desarrollo). Cualquier otro valor es SQL Server (Azure).</summary>
    public static bool UsaSqlite(IConfiguration configuration) =>
        string.Equals(configuration[ClaveProveedor], "Sqlite", StringComparison.OrdinalIgnoreCase);

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Base de datos: SQLite (un archivo .db, no hay que instalar nada) en desarrollo, Azure SQL en producción.
        // Se elige con BaseDatos:Proveedor ("Sqlite" o "SqlServer").
        // La cadena de Azure nunca va en git: se configura como ConnectionStrings__EstacionamientoDb.
        var cadena = configuration.GetConnectionString(NombreCadenaConexion);
        if (string.IsNullOrWhiteSpace(cadena))
            throw new InvalidOperationException(
                $"Falta la cadena de conexión \"{NombreCadenaConexion}\". " +
                "En desarrollo va en appsettings.Development.json; en Azure, en Connection strings.");

        var usarSqlite = UsaSqlite(configuration);
        services.AddDbContext<EstacionamientoDbContext>(o =>
        {
            if (usarSqlite)
                o.UseSqlite(cadena);
            else
                o.UseSqlServer(cadena);
        });

        services.AddScoped<IUnidadDeTrabajo, UnidadDeTrabajo>();
        services.AddScoped<IUsuarioDao, UsuarioDao>();
        services.AddScoped<IVehiculoDao, VehiculoDao>();
        services.AddScoped<ICajonDao, CajonDao>();
        services.AddScoped<IAccesoDao, AccesoDao>();
        services.AddScoped<IAlertaDao, AlertaDao>();
        services.AddScoped<IEventoSensorDao, EventoSensorDao>();

        // Seguridad.
        services.Configure<OpcionesJwt>(configuration.GetSection(OpcionesJwt.Seccion));
        services.AddSingleton<IGeneradorToken, GeneradorToken>();
        services.AddSingleton<IHasherContrasenas, HasherContrasenas>();
        services.TryAddSingleton(TimeProvider.System);

        // Semilla del administrador (ver InicializadorBaseDatos).
        services.Configure<OpcionesAdministrador>(configuration.GetSection(OpcionesAdministrador.Seccion));

        // Servicios externos. Mientras no existan los de Azure (Fase 4) se usan versiones locales.
        services.AddHttpContextAccessor();
        services.AddSingleton<IAlmacenFotos, AlmacenFotosLocal>();
        services.AddSingleton<ILectorPlacas, LectorPlacasSinAzure>();
        services.AddSingleton<IComandosMaqueta, ComandosMaquetaLocal>();
        services.AddSingleton<INotificadorTiempoReal, NotificadorSinTiempoReal>();

        // Procesos en segundo plano.
        services.AddHostedService<RevisionAutosSinCajon>();

        return services;
    }
}
