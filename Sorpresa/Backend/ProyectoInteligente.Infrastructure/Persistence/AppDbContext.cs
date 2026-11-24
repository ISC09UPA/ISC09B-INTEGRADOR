using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Domain.Entities;
using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Doctor> Doctores => Set<Doctor>();
    public DbSet<Consultorio> Consultorios => Set<Consultorio>();
    public DbSet<Cita> Citas => Set<Cita>();
    public DbSet<Turno> Turnos => Set<Turno>();
    public DbSet<TagRfid> TagsRfid => Set<TagRfid>();
    public DbSet<Acceso> Accesos => Set<Acceso>();
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<Configuracion> Configuraciones => Set<Configuracion>();
    public DbSet<EventoPendiente> EventosPendientes => Set<EventoPendiente>();
    public DbSet<OcupacionSala> OcupacionesSala => Set<OcupacionSala>();

    protected override void ConfigureConventions(ModelConfigurationBuilder c)
    {
        c.Properties<DateTime>().HaveConversion<UtcConverter>();   // NEW
        c.Properties<string>().HaveMaxLength(200);
        c.Properties<EstadoCita>().HaveConversion<SnakeEnumConverter<EstadoCita>>().HaveMaxLength(20);
        c.Properties<EstadoTurno>().HaveConversion<SnakeEnumConverter<EstadoTurno>>().HaveMaxLength(20);
        c.Properties<ResultadoAcceso>().HaveConversion<SnakeEnumConverter<ResultadoAcceso>>().HaveMaxLength(20);
        c.Properties<TipoAlerta>().HaveConversion<SnakeEnumConverter<TipoAlerta>>().HaveMaxLength(20);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Rol>().ToTable("roles").HasIndex(x => x.Nombre).IsUnique();
        b.Entity<Usuario>().ToTable("usuarios").HasIndex(x => x.Correo).IsUnique();
        b.Entity<Doctor>().ToTable("doctores").HasKey(x => x.UsuarioId);
        b.Entity<Doctor>().Property(x => x.UsuarioId).ValueGeneratedNever();
        b.Entity<Doctor>().HasOne(x => x.Usuario).WithOne().HasForeignKey<Doctor>(x => x.UsuarioId);
        b.Entity<Consultorio>().ToTable("consultorios");
        b.Entity<Cita>().ToTable("citas");
        b.Entity<Turno>().ToTable("turnos").HasIndex(x => new { x.ConsultorioId, x.Estado, x.LlegadaEn });   // CHANGED
        b.Entity<TagRfid>().ToTable("tags_rfid").HasIndex(x => x.Uid).IsUnique();
        b.Entity<Acceso>().ToTable("accesos").HasIndex(x => x.CreadoEn);
        b.Entity<Alerta>().ToTable("alertas").HasIndex(x => x.Leida);   // CHANGED
        b.Entity<Configuracion>().ToTable("configuracion").HasKey(x => x.Clave);
        b.Entity<EventoPendiente>().ToTable("eventos_pendientes").Property(x => x.Payload).HasColumnType("json");
        b.Entity<OcupacionSala>().ToTable("ocupacion_sala");

        // todas las FK en Restrict
        foreach (var fk in b.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;

        // columnas en snake_case y fechas con default en la base
        foreach (var e in b.Model.GetEntityTypes())
            foreach (var p in e.GetProperties())
            {
                p.SetColumnName(Regex.Replace(p.Name, "(?<!^)([A-Z])", "_$1").ToLower());
                if (p.Name is "CreadoEn" or "LlegadaEn")
                {
                    p.SetDefaultValueSql("CURRENT_TIMESTAMP");
                    p.ValueGenerated = ValueGenerated.OnAdd;
                }
            }
    }
}
