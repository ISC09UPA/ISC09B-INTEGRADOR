using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlimentadorInteligente.Infrastructure.Persistence.Configurations;

public class GatewayConfiguration : IEntityTypeConfiguration<Gateway>
{
    public void Configure(EntityTypeBuilder<Gateway> b)
    {
        b.Property(g => g.DeviceId).HasMaxLength(50).IsRequired();
        b.HasIndex(g => g.DeviceId).IsUnique();
        b.Property(g => g.DeviceKeyHash).HasMaxLength(64).IsRequired();
    }
}

public class AlimentadorConfiguration : IEntityTypeConfiguration<Alimentador>
{
    public void Configure(EntityTypeBuilder<Alimentador> b)
    {
        b.Property(a => a.Codigo).HasMaxLength(50).IsRequired();
        b.HasIndex(a => a.Codigo).IsUnique();
        b.Property(a => a.Nombre).HasMaxLength(100).IsRequired();
        b.Property(a => a.VersionFirmware).HasMaxLength(30);
        b.Property(a => a.VersionModelo).HasMaxLength(30);
        b.HasOne(a => a.Gateway).WithMany(g => g.Alimentadores)
            .HasForeignKey(a => a.GatewayId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class MiembroAlimentadorConfiguration : IEntityTypeConfiguration<MiembroAlimentador>
{
    public void Configure(EntityTypeBuilder<MiembroAlimentador> b)
    {
        b.HasKey(m => new { m.AlimentadorId, m.UsuarioId });
        b.HasOne(m => m.Alimentador).WithMany(a => a.Miembros).HasForeignKey(m => m.AlimentadorId);
        b.HasOne(m => m.Usuario).WithMany(u => u.Alimentadores).HasForeignKey(m => m.UsuarioId);
    }
}

public class MascotaConfiguration : IEntityTypeConfiguration<Mascota>
{
    public void Configure(EntityTypeBuilder<Mascota> b)
    {
        b.Property(m => m.Nombre).HasMaxLength(50).IsRequired();
        b.Property(m => m.EtiquetaRfid).HasMaxLength(32);
        b.HasIndex(m => new { m.AlimentadorId, m.EtiquetaRfid }).IsUnique()
            .HasFilter("\"EtiquetaRfid\" IS NOT NULL");
        b.HasOne(m => m.Alimentador).WithMany(a => a.Mascotas).HasForeignKey(m => m.AlimentadorId);
    }
}

public class HorarioConfiguration : IEntityTypeConfiguration<Horario>
{
    public void Configure(EntityTypeBuilder<Horario> b)
    {
        b.HasOne(h => h.Alimentador).WithMany(a => a.Horarios).HasForeignKey(h => h.AlimentadorId);
        b.HasOne(h => h.Mascota).WithMany().HasForeignKey(h => h.MascotaId).OnDelete(DeleteBehavior.Cascade);
    }
}
