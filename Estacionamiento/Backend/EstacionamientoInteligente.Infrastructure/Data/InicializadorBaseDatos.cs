using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EstacionamientoInteligente.Infrastructure.Data;

/// <summary>
/// Lo que se hace con la base al arrancar la API:
/// <list type="number">
///   <item>Solo si <paramref name="crearTablas"/> (SQLite en desarrollo): crea el archivo .db con sus tablas
///         si no existe y agrega los 4 cajones de la maqueta que falten. En Azure las tablas y los cajones
///         los crea Carlos a mano con <c>Scripts/01_CrearTablas.sql</c> y <c>02_DatosIniciales.sql</c>.</item>
///   <item>Siempre: crea el usuario Administrador de la sección "Administrador" si todavía no existe.
///         Va aquí y no en el script porque su contraseña se guarda con hash BCrypt.</item>
/// </list>
/// </summary>
public static class InicializadorBaseDatos
{
    private const int CajonesMaqueta = 4;

    public static async Task InicializarAsync(IServiceProvider servicios, bool crearTablas)
    {
        await using var scope = servicios.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<EstacionamientoDbContext>();
        var reloj = scope.ServiceProvider.GetRequiredService<TimeProvider>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(InicializadorBaseDatos));

        try
        {
            if (crearTablas)
                await CrearBaseYCajonesAsync(db, reloj, logger);

            await CrearAdministradorAsync(
                db,
                scope.ServiceProvider.GetRequiredService<IOptions<OpcionesAdministrador>>().Value,
                scope.ServiceProvider.GetRequiredService<IHasherContrasenas>(),
                reloj,
                logger);
        }
        catch (Exception ex)
        {
            // Sin base la API arranca igual (se puede ver /scalar), pero los endpoints que la usan darán 500.
            logger.LogError(ex, "No se pudo conectar con la base de datos. Revisa ConnectionStrings:EstacionamientoDb.");
        }
    }

    private static async Task CrearBaseYCajonesAsync(EstacionamientoDbContext db, TimeProvider reloj, ILogger logger)
    {
        // Crea la base y las tablas a partir de Data/Configuraciones. Si ya existe no hace nada.
        if (await db.Database.EnsureCreatedAsync())
            logger.LogInformation("La base no existía; se creó con sus tablas.");

        var existentes = await db.Cajones.Select(c => c.Numero).ToListAsync();
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var faltantes = Enumerable.Range(1, CajonesMaqueta).Except(existentes).ToList();

        foreach (var numero in faltantes)
            db.Cajones.Add(Cajon.Crear(numero, ahora));

        if (faltantes.Count > 0)
        {
            await db.SaveChangesAsync();
            logger.LogInformation("Se crearon {Cantidad} cajones.", faltantes.Count);
        }
    }

    private static async Task CrearAdministradorAsync(
        EstacionamientoDbContext db, OpcionesAdministrador opciones, IHasherContrasenas hasher, TimeProvider reloj, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(opciones.Correo) || string.IsNullOrWhiteSpace(opciones.Contrasena))
        {
            logger.LogWarning("No se creó el administrador: falta Administrador:Correo o Administrador:Contrasena en la configuración.");
            return;
        }

        var correo = Usuario.NormalizarCorreo(opciones.Correo);
        if (await db.Usuarios.AnyAsync(u => u.Correo == correo))
            return; // Ya existe: no se le cambia la contraseña.

        db.Usuarios.Add(Usuario.Crear(
            opciones.Nombre, correo, hasher.Hashear(opciones.Contrasena),
            RolUsuario.Administrador, reloj.GetUtcNow().UtcDateTime));
        await db.SaveChangesAsync();

        logger.LogInformation("Se creó el administrador {Correo}.", correo);
    }
}
