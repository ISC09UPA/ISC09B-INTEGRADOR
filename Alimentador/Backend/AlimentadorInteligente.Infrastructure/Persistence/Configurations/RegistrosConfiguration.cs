using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlimentadorInteligente.Infrastructure.Persistence.Configurations;

public class VisitaConfiguration : IEntityTypeConfiguration<Visita>
{
    public void Configure(EntityTypeBuilder<Visita> b)
    {
        b.Property(v => v.EventId).HasMaxLength(64).IsRequired();
        // El eventId del ESP32 evita duplicados cuando la Pi reenvía un lote (RNF-15)
        b.HasIndex(v => new { v.AlimentadorId, v.EventId }).IsUnique();
        b.HasIndex(v => new { v.MascotaId, v.IniciadaEn });
        b.HasOne(v => v.Mascota).WithMany(m => m.Visitas).HasForeignKey(v => v.MascotaId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class EventoAlimentadorConfiguration : IEntityTypeConfiguration<EventoAlimentador>
{
    public void Configure(EntityTypeBuilder<EventoAlimentador> b)
    {
        b.Property(e => e.EventId).HasMaxLength(64).IsRequired();
        b.HasIndex(e => new { e.AlimentadorId, e.EventId }).IsUnique();
        b.Property(e => e.Detalle).HasMaxLength(500);
    }
}

public class AlertaConfiguration : IEntityTypeConfiguration<Alerta>
{
    public void Configure(EntityTypeBuilder<Alerta> b)
    {
        b.Property(a => a.Mensaje).HasMaxLength(300).IsRequired();
        b.HasIndex(a => new { a.AlimentadorId, a.OcurridaEn });
        b.HasOne(a => a.Mascota).WithMany().HasForeignKey(a => a.MascotaId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class ComandoConfiguration : IEntityTypeConfiguration<Comando>
{
    public void Configure(EntityTypeBuilder<Comando> b)
    {
        b.Property(c => c.Error).HasMaxLength(300);
        b.HasIndex(c => new { c.AlimentadorId, c.Estado });
        b.HasOne(c => c.SolicitadoPor).WithMany().HasForeignKey(c => c.SolicitadoPorId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class AjusteRacionConfiguration : IEntityTypeConfiguration<AjusteRacion>
{
    public void Configure(EntityTypeBuilder<AjusteRacion> b)
    {
        b.Property(a => a.Motivo).HasMaxLength(200);
        b.HasIndex(a => new { a.MascotaId, a.Dia }).IsUnique();
        b.HasOne(a => a.Mascota).WithMany(m => m.Ajustes).HasForeignKey(a => a.MascotaId);
    }
}

public class FotoDudosaConfiguration : IEntityTypeConfiguration<FotoDudosa>
{
    public void Configure(EntityTypeBuilder<FotoDudosa> b)
    {
        b.Property(f => f.EventId).HasMaxLength(64).IsRequired();
        b.Property(f => f.BlobNombre).HasMaxLength(300).IsRequired();
        b.HasIndex(f => new { f.AlimentadorId, f.EventId }).IsUnique();
    }
}

public class ArtefactoOtaConfiguration : IEntityTypeConfiguration<ArtefactoOta>
{
    public void Configure(EntityTypeBuilder<ArtefactoOta> b)
    {
        b.Property(a => a.Version).HasMaxLength(30).IsRequired();
        b.Property(a => a.BlobNombre).HasMaxLength(300).IsRequired();
        b.Property(a => a.Sha256).HasMaxLength(64).IsRequired();
        b.HasIndex(a => new { a.Tipo, a.Version }).IsUnique();
    }
}
