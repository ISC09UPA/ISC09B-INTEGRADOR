using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EstacionamientoInteligente.Infrastructure.Data.Configuraciones;

/// <summary>Tabla <c>Usuarios</c>.</summary>
public class UsuarioConfiguracion : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder.ToTable("Usuarios");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(u => u.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
        builder.Property(u => u.Correo).HasColumnName("correo").HasMaxLength(150).IsRequired();
        builder.Property(u => u.ContrasenaHash).HasColumnName("contrasena_hash").HasMaxLength(255).IsRequired();
        builder.Property(u => u.Rol).HasColumnName("rol").HasConversion<string>().HasMaxLength(20);
        builder.Property(u => u.FechaRegistro).HasColumnName("fecha_registro");

        // Vehículos del usuario. EF llena la lista privada _vehiculos.
        builder.HasMany(u => u.Vehiculos)
            .WithOne(v => v.Usuario)
            .HasForeignKey(v => v.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Navigation(u => u.Vehiculos).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
