using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EstacionamientoInteligente.Infrastructure.Data.Configuraciones;

/// <summary>Tabla <c>Vehiculos</c>.</summary>
public class VehiculoConfiguracion : IEntityTypeConfiguration<Vehiculo>
{
    public void Configure(EntityTypeBuilder<Vehiculo> builder)
    {
        builder.ToTable("Vehiculos");

        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasColumnName("id").ValueGeneratedNever();

        // La placa (value object) se guarda en dos columnas de la misma tabla:
        // placa = "ABC-123-A" (lo que se muestra) y placa_clave = "ABC123A" (lo que se compara).
        // Si la placa no fue legible, las dos quedan en NULL.
        builder.OwnsOne(v => v.Placa, placa =>
        {
            placa.Property(p => p.Valor).HasColumnName("placa").HasMaxLength(20).IsRequired();
            placa.Property(p => p.Clave).HasColumnName("placa_clave").HasMaxLength(10).IsRequired();
        });
        builder.Navigation(v => v.Placa).IsRequired(false);

        builder.Property(v => v.Tipo).HasColumnName("tipo_vehiculo").HasConversion<string>().HasMaxLength(20);
        builder.Property(v => v.UsuarioId).HasColumnName("id_usuario");
        builder.Property(v => v.Estado).HasColumnName("estado").HasConversion<string>().HasMaxLength(10);
        builder.Property(v => v.FechaAlta).HasColumnName("fecha_alta");
        builder.Property(v => v.FechaBaja).HasColumnName("fecha_baja");

        // La relación con Usuario se configura en UsuarioConfiguracion.
    }
}
