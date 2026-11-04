using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EstacionamientoInteligente.Infrastructure.Data.Configuraciones;

/// <summary>Tabla <c>Alertas</c>.</summary>
public class AlertaConfiguracion : IEntityTypeConfiguration<Alerta>
{
    public void Configure(EntityTypeBuilder<Alerta> builder)
    {
        builder.ToTable("Alertas");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(a => a.Tipo).HasColumnName("tipo").HasConversion<string>().HasMaxLength(30);
        builder.Property(a => a.Mensaje).HasColumnName("mensaje").HasMaxLength(255).IsRequired();
        builder.Property(a => a.Placa).HasColumnName("placa").HasMaxLength(20);
        builder.Property(a => a.Foto).HasColumnName("foto").HasMaxLength(300);
        builder.Property(a => a.VehiculoId).HasColumnName("id_vehiculo");
        builder.Property(a => a.Fecha).HasColumnName("fecha");
        builder.Property(a => a.Atendida).HasColumnName("atendida");
        builder.Property(a => a.FechaAtencion).HasColumnName("fecha_atencion");
        builder.Property(a => a.AtendidaPorId).HasColumnName("id_usuario_atiende");

        // El modelo solo guarda los ids, sin propiedad de navegación.
        builder.HasOne<Vehiculo>()
            .WithMany()
            .HasForeignKey(a => a.VehiculoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(a => a.AtendidaPorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
