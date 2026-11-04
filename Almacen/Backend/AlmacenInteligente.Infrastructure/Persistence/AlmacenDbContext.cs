using AlmacenInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Persistence;

// Mapea las 9 tablas que ya existen en db-almacen. No se usan migraciones:
// el esquema se administra con el script SQL del Query editor.
public class AlmacenDbContext(DbContextOptions<AlmacenDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Anaquel> Anaqueles => Set<Anaquel>();
    public DbSet<Espacio> Espacios => Set<Espacio>();
    public DbSet<Movimiento> Movimientos => Set<Movimiento>();
    public DbSet<LecturaPeso> LecturasPeso => Set<LecturaPeso>();
    public DbSet<ConteoVisual> ConteosVisuales => Set<ConteoVisual>();
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<Estadistica> Estadisticas => Set<Estadistica>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("Usuarios");
            e.HasKey(x => x.Id);
            e.Property(x => x.NombreUsuario).HasMaxLength(50).IsRequired();
            e.Property(x => x.HashContrasena).HasMaxLength(200).IsRequired();
            e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
            e.Property(x => x.Rol).HasMaxLength(20).IsRequired();
        });

        modelBuilder.Entity<Producto>(e =>
        {
            e.ToTable("Productos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(20);
            e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
            e.Property(x => x.Descripcion).HasMaxLength(300);
            e.Property(x => x.EtiquetaVision).HasMaxLength(50);
            e.Property(x => x.ImagenUrl).HasMaxLength(400);
        });

        modelBuilder.Entity<Anaquel>(e =>
        {
            e.ToTable("Anaqueles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(10);
            e.Property(x => x.Descripcion).HasMaxLength(100);
        });

        modelBuilder.Entity<Espacio>(e =>
        {
            e.ToTable("Espacios");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(10);
            e.Property(x => x.AnaquelId).HasMaxLength(10).IsRequired();
            e.Property(x => x.ProductoId).HasMaxLength(20);
            e.HasOne(x => x.Anaquel).WithMany(a => a.Espacios).HasForeignKey(x => x.AnaquelId);
            e.HasOne(x => x.Producto).WithMany(p => p.Espacios).HasForeignKey(x => x.ProductoId).IsRequired(false);
        });

        modelBuilder.Entity<Movimiento>(e =>
        {
            e.ToTable("Movimientos");
            e.HasKey(x => x.Id);
            e.Property(x => x.ProductoId).HasMaxLength(20).IsRequired();
            e.Property(x => x.TipoMovimiento).HasMaxLength(10).IsRequired();
            e.Property(x => x.Origen).HasMaxLength(10).IsRequired();
            e.HasOne(x => x.Producto).WithMany(p => p.Movimientos).HasForeignKey(x => x.ProductoId);
            e.HasOne(x => x.Usuario).WithMany(u => u.Movimientos).HasForeignKey(x => x.UsuarioId).IsRequired(false);
        });

        modelBuilder.Entity<LecturaPeso>(e =>
        {
            e.ToTable("LecturasPeso");
            e.HasKey(x => x.Id);
            e.Property(x => x.EspacioId).HasMaxLength(10).IsRequired();
            e.HasOne(x => x.Espacio).WithMany(s => s.LecturasPeso).HasForeignKey(x => x.EspacioId);
        });

        modelBuilder.Entity<ConteoVisual>(e =>
        {
            e.ToTable("ConteosVisuales");
            e.HasKey(x => x.Id);
            e.Property(x => x.AnaquelId).HasMaxLength(10).IsRequired();
            e.Property(x => x.ProductoId).HasMaxLength(20).IsRequired();
            e.HasOne(x => x.Anaquel).WithMany(a => a.ConteosVisuales).HasForeignKey(x => x.AnaquelId);
            e.HasOne(x => x.Producto).WithMany(p => p.ConteosVisuales).HasForeignKey(x => x.ProductoId);
        });

        modelBuilder.Entity<Alerta>(e =>
        {
            e.ToTable("Alertas");
            e.HasKey(x => x.Id);
            e.Property(x => x.ProductoId).HasMaxLength(20).IsRequired();
            e.Property(x => x.Estado).HasMaxLength(10).IsRequired();
            e.HasOne(x => x.Producto).WithMany(p => p.Alertas).HasForeignKey(x => x.ProductoId);
        });

        modelBuilder.Entity<Estadistica>(e =>
        {
            e.ToTable("Estadisticas");
            e.HasKey(x => x.ProductoId);
            e.Property(x => x.ProductoId).HasMaxLength(20);
            e.HasOne(x => x.Producto).WithOne(p => p.Estadistica).HasForeignKey<Estadistica>(x => x.ProductoId);
        });

        // Las columnas en SQL están en camelCase (pesoUnitarioGramos, fechaHora...).
        foreach (var entidad in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var propiedad in entidad.GetProperties())
            {
                var nombre = propiedad.Name;
                propiedad.SetColumnName(char.ToLowerInvariant(nombre[0]) + nombre[1..]);
            }
        }

        // Excepción: la propiedad NombreUsuario corresponde a la columna "usuario".
        modelBuilder.Entity<Usuario>().Property(x => x.NombreUsuario).HasColumnName("usuario");

        // La base no borra en cascada; EF tampoco debe hacerlo.
        foreach (var relacion in modelBuilder.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys()))
        {
            relacion.DeleteBehavior = DeleteBehavior.NoAction;
        }
    }
}
