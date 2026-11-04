using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EstacionamientoInteligente.Infrastructure.Data.Configuraciones;

/// <summary>Tabla <c>Accesos</c>: cada entrada con su salida.</summary>
public class AccesoConfiguracion : IEntityTypeConfiguration<Acceso>
{
    public void Configure(EntityTypeBuilder<Acceso> builder)
    {
        builder.ToTable("Accesos");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(a => a.VehiculoId).HasColumnName("id_vehiculo");
        builder.Property(a => a.CajonId).HasColumnName("id_cajon");
        builder.Property(a => a.Estacionado).HasColumnName("estacionado");
        builder.Property(a => a.SinCajonDesde).HasColumnName("sin_cajon_desde");
        builder.Property(a => a.HoraEntrada).HasColumnName("hora_entrada");
        builder.Property(a => a.HoraSalida).HasColumnName("hora_salida");
        builder.Property(a => a.FotoEntrada).HasColumnName("foto_entrada").HasMaxLength(300).IsRequired();
        builder.Property(a => a.FotoSalida).HasColumnName("foto_salida").HasMaxLength(300);
        builder.Property(a => a.ConfianzaOcr).HasColumnName("confianza_ocr");
        builder.Property(a => a.Origen).HasColumnName("origen").HasConversion<string>().HasMaxLength(10);

        builder.HasOne(a => a.Vehiculo)
            .WithMany()
            .HasForeignKey(a => a.VehiculoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Cajon)
            .WithMany()
            .HasForeignKey(a => a.CajonId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
