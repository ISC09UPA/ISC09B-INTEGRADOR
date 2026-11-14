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
                entity.Property(u => u.id_Usuario).ValueGeneratedOnAdd();
                entity.Property(u => u.correo).IsRequired().HasMaxLength(255);
                entity.Property(u => u.contrasena).IsRequired().HasMaxLength(255);
                entity.Property(u => u.nombre).IsRequired().HasMaxLength(255);
                entity.Property(u => u.fecha_Registro).HasDefaultValueSql("getdate()");
                entity.HasIndex(u => u.correo).IsUnique();
            });

            modelBuilder.Entity<Sensor>(entity =>
            {
                entity.ToTable("Sensores");
                entity.HasKey(s => s.id_Sensor);
                entity.Property(s => s.id_Sensor).ValueGeneratedOnAdd();
                entity.Property(s => s.codigo_hardware).IsRequired().HasMaxLength(50);
                entity.HasMany(s => s.Lecturas)
                      .WithOne(l => l.Sensor)
                      .HasForeignKey(l => l.id_Sensor);
            });

            modelBuilder.Entity<Lectura>(entity =>
            {
                entity.ToTable("Lectura");
                entity.HasKey(l => l.id_Lectura);
                entity.Property(l => l.id_Lectura).ValueGeneratedOnAdd();
            });
        }
    }
}
