using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace EstacionamientoInteligente.Infrastructure.Data;

/// <summary>
/// Conexión con Azure SQL (LocalDB en desarrollo) usando EF Core.
/// Une cada modelo del dominio con su tabla de <c>Scripts/01_CrearTablas.sql</c>.
/// </summary>
/// <remarks>
/// Solo lo usan los DAOs de Infrastructure; Domain y Application no saben que existe.
/// Las tablas se crean con los scripts SQL, no con migraciones de EF.
/// </remarks>
public class EstacionamientoDbContext(DbContextOptions<EstacionamientoDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Vehiculo> Vehiculos => Set<Vehiculo>();
    public DbSet<Cajon> Cajones => Set<Cajon>();
    public DbSet<Acceso> Accesos => Set<Acceso>();
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<EventoSensor> EventosSensor => Set<EventoSensor>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Lee las clases de Data/Configuraciones (una por tabla).
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(EstacionamientoDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Todas las fechas se guardan en UTC. SQL no guarda ese dato, así que al leerlas
        // se marcan como UTC para que la API las mande terminando en "Z".
        configurationBuilder.Properties<DateTime>().HaveConversion<FechaUtcConverter>();
    }

    private sealed class FechaUtcConverter() : ValueConverter<DateTime, DateTime>(
        fecha => fecha.Kind == DateTimeKind.Local ? fecha.ToUniversalTime() : fecha,
        fecha => DateTime.SpecifyKind(fecha, DateTimeKind.Utc));
}
