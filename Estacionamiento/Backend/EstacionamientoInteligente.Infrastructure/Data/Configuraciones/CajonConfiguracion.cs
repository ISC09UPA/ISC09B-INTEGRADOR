using EstacionamientoInteligente.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EstacionamientoInteligente.Infrastructure.Data.Configuraciones;

/// <summary>Tabla <c>Cajones</c>. Los 4 cajones se crean con <c>Scripts/02_DatosIniciales.sql</c>.</summary>
public class CajonConfiguracion : IEntityTypeConfiguration<Cajon>
{
    public void Configure(EntityTypeBuilder<Cajon> builder)
    {
        builder.ToTable("Cajones");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(c => c.Numero).HasColumnName("numero");
        builder.Property(c => c.Estado).HasColumnName("estado").HasConversion<string>().HasMaxLength(10);
        builder.Property(c => c.UltimoCambio).HasColumnName("ultimo_cambio");
    }
}
