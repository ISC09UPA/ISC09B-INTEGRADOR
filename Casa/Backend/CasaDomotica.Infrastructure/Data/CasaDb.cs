using CasaDomotica.Domain;
using Microsoft.EntityFrameworkCore;

namespace CasaDomotica.Infrastructure.Data;

public class CasaDb : DbContext
{
    public CasaDb(DbContextOptions<CasaDb> options) : base(options)
    {
    }

    public DbSet<Persona> Personas => Set<Persona>();
    public DbSet<AccesoLog> Accesos => Set<AccesoLog>();
    public DbSet<AlertaLog> Alertas => Set<AlertaLog>();
    public DbSet<Luz> Luces => Set<Luz>();
    public DbSet<ClimaRegistro> Clima => Set<ClimaRegistro>();
    public DbSet<Ajuste> Ajustes => Set<Ajuste>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Luz>().HasKey(x => x.Nombre);
        b.Entity<ClimaRegistro>().HasKey(x => x.Zona);
        b.Entity<Ajuste>().Property(x => x.Id).ValueGeneratedNever();
        b.Entity<Persona>().HasIndex(x => x.Nombre).IsUnique();
    }

    /// <summary>Agrega a la persona si todavía no existe (sin distinguir mayúsculas).</summary>
    public async Task AsegurarPersonaAsync(string nombre, CancellationToken ct = default)
    {
        var n = nombre.Trim();
        if (n.Length == 0)
        {
            return;
        }

        var minus = n.ToLower();
        if (!await Personas.AnyAsync(p => p.Nombre.ToLower() == minus, ct))
        {
            Personas.Add(new Persona { Nombre = n });
            await SaveChangesAsync(ct);
        }
    }
}

public static class Semilla
{
    /// <summary>Crea la base de datos si no existe y le pone los datos iniciales.</summary>
    public static void Aplicar(CasaDb db)
    {
        db.Database.EnsureCreated();

        if (!db.Ajustes.Any())
        {
            db.Ajustes.Add(new Ajuste { Id = 1, SeguridadActiva = true, Lux = 0 });
        }

        // Mismos nombres que los LED de la Raspberry (casa_domotica.py).
        if (!db.Luces.Any())
        {
            db.Luces.AddRange(
                new Luz { Nombre = "Sala", Encendida = false },
                new Luz { Nombre = "Cocina", Encendida = false },
                new Luz { Nombre = "Recámara 1", Encendida = false },
                new Luz { Nombre = "Recámara 2", Encendida = false });
        }

        db.SaveChanges();
    }
}
