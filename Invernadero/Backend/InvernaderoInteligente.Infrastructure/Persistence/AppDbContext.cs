using InvernaderoInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InvernaderoInteligente.Infrastructure.Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Sensor> Sensores { get; set; }
        public DbSet<Lectura> Lecturas { get; set; }
        public DbSet<TipoSensor> TipoSensores { get; set; }
        public DbSet<Maceta> Macetas { get; set; }
        public DbSet<Cultivo> Cultivos { get; set; }
        public DbSet<Especie> Especies { get; set; }
        public DbSet<Actuador> Actuadores { get; set; }
        public DbSet<HisRiesgo> HisRiesgos { get; set; }

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
                entity.Property(u => u.fecha_Registro).ValueGeneratedOnAdd();
                entity.HasIndex(u => u.correo).IsUnique();
            });

            modelBuilder.Entity<Sensor>(entity =>
            {
                entity.ToTable("Sensores");
                entity.HasKey(s => s.id_Sensor);
                entity.Property(s => s.id_Sensor).ValueGeneratedOnAdd();
                entity.Property(s => s.id_T_Sensor).IsRequired();
                entity.Property(s => s.id_Maceta).IsRequired();
                entity.Property(s => s.codigo_hardware).IsRequired().HasColumnType("varchar(50)").HasMaxLength(50);
                entity.Property(s => s.estado).HasColumnType("date");
                entity.HasOne(s => s.TipoSensor)
                      .WithMany(t => t.Sensores)
                      .HasForeignKey(s => s.id_T_Sensor);
                entity.HasOne(s => s.Maceta)
                      .WithMany(m => m.Sensores)
                      .HasForeignKey(s => s.id_Maceta);
                entity.HasMany(s => s.Lecturas)
                      .WithOne(l => l.Sensor)
                      .HasForeignKey(l => l.id_Sensor);
            });

            modelBuilder.Entity<Lectura>(entity =>
            {
                entity.ToTable("Lectura");
                entity.HasKey(l => l.id_Lectura);
                entity.Property(l => l.id_Lectura).ValueGeneratedOnAdd();
                entity.Property(l => l.valor).IsRequired().HasColumnType("float");
                entity.Property(l => l.fecha_L_Hora).IsRequired().HasColumnType("datetime");
            });

            modelBuilder.Entity<TipoSensor>(entity =>
            {
                entity.ToTable("Tipo_Sensor");
                entity.HasKey(t => t.id_T_Sensor);
                entity.Property(t => t.id_T_Sensor).ValueGeneratedOnAdd();
                entity.Property(t => t.fecha_Despliegue).IsRequired().HasColumnType("date");
                entity.Property(t => t.nombre).IsRequired().HasMaxLength(100);
                entity.Property(t => t.unidad_Medida).IsRequired().HasMaxLength(50);
                entity.HasMany(t => t.Sensores)
                      .WithOne(s => s.TipoSensor)
                      .HasForeignKey(s => s.id_T_Sensor);
            });

            modelBuilder.Entity<Cultivo>(entity =>
            {
                entity.ToTable("Cultivos");
                entity.HasKey(c => c.id_Cultivo);
                entity.Property(c => c.id_Cultivo).ValueGeneratedOnAdd();
                entity.Property(c => c.nombre).IsRequired().HasMaxLength(100);
                entity.Property(c => c.humedad_Min).IsRequired().HasColumnType("float");
                entity.Property(c => c.humedad_Max).IsRequired().HasColumnType("float");
            });

            modelBuilder.Entity<Especie>(entity =>
            {
                entity.ToTable("Especies");
                entity.HasKey(e => e.id_Planta);
                entity.Property(e => e.id_Planta).ValueGeneratedOnAdd();
                entity.Property(e => e.nombre).IsRequired().HasMaxLength(255);
            });

            modelBuilder.Entity<Maceta>(entity =>
            {
                entity.ToTable("Maceta");
                entity.HasKey(m => m.id_Maceta);
                entity.Property(m => m.id_Maceta).ValueGeneratedOnAdd();
                entity.Property(m => m.etiqueta).IsRequired().HasColumnType("varchar(50)").HasMaxLength(50);
                entity.Property(m => m.Fecha_Siembra).IsRequired().HasColumnType("date");
                entity.HasOne(m => m.Cultivo)
                      .WithMany(c => c.Macetas)
                      .HasForeignKey(m => m.id_Cultivo);
                entity.HasOne(m => m.Planta)
                      .WithMany(e => e.Macetas)
                      .HasForeignKey(m => m.id_Planta);
            });

            modelBuilder.Entity<Actuador>(entity =>
            {
                entity.ToTable("Actuadores");
                entity.HasKey(a => a.id_Actuador);
                entity.Property(a => a.id_Actuador).ValueGeneratedOnAdd();
                entity.Property(a => a.nombre).IsRequired().HasMaxLength(100);
                entity.Property(a => a.tipo).IsRequired().HasMaxLength(100);
                entity.Property(a => a.estado_Actual).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<HisRiesgo>(entity =>
            {
                entity.ToTable("His_Riesgos");
                entity.HasKey(h => h.id_Historial);
                entity.Property(h => h.id_Historial).ValueGeneratedOnAdd();
                entity.Property(h => h.duracion_Seg).IsRequired().HasColumnType("float");
                entity.Property(h => h.disparador_Por).IsRequired();
                entity.Property(h => h.fecha_R_hora).IsRequired().HasColumnType("datetime");
                entity.HasOne(h => h.Maceta)
                      .WithMany(m => m.HisRiesgos)
                      .HasForeignKey(h => h.id_Maceta);
                entity.HasOne(h => h.Actuador)
                      .WithMany(a => a.HisRiesgos)
                      .HasForeignKey(h => h.id_Actuador);
            });
        }
    }
}
