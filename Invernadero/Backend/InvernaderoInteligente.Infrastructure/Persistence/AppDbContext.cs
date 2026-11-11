using InvernaderoInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InvernaderoInteligente.Infrastructure.Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Lectura> Lecturas { get; set; }
        public DbSet<Sensor> Sensores { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.ToTable("Usuarios");
                entity.HasKey(u => u.id_Usuario);
                entity.Property(u => u.correo).IsRequired().HasMaxLength(256);
                entity.Property(u => u.contrasena).IsRequired();
                entity.Property(u => u.nombre).HasMaxLength(150);
                entity.Property(u => u.rol).HasMaxLength(50);
                entity.HasIndex(u => u.correo).IsUnique();
            });

            modelBuilder.Entity<Sensor>(entity =>
            {
                entity.ToTable("Sensores");
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Nombre).IsRequired().HasMaxLength(150);
                entity.HasMany(s => s.Lecturas)
                      .WithOne(l => l.Sensor)
                      .HasForeignKey(l => l.SensorId);
            });

            modelBuilder.Entity<Lectura>(entity =>
            {
                entity.ToTable("Lecturas");
                entity.HasKey(l => l.Id);
            });
        }
    }
}
