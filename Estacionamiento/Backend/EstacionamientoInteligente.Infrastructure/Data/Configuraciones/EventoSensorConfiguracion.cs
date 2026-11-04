using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EstacionamientoInteligente.Infrastructure.Data.Configuraciones;

/// <summary>Tabla <c>EventosSensor</c>: bitácora de la pluma y los sensores IR.</summary>
public class EventoSensorConfiguracion : IEntityTypeConfiguration<EventoSensor>
{
    public void Configure(EntityTypeBuilder<EventoSensor> builder)
    {
        builder.ToTable("EventosSensor");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(e => e.Dispositivo).HasColumnName("dispositivo").HasMaxLength(50).IsRequired();
        builder.Property(e => e.Tipo).HasColumnName("tipo").HasConversion<string>().HasMaxLength(10);
        builder.Property(e => e.Valor).HasColumnName("valor").HasMaxLength(100).IsRequired();
        builder.Property(e => e.Detalle).HasColumnName("detalle").HasMaxLength(255);
        builder.Property(e => e.Fecha).HasColumnName("fecha");
    }
}
