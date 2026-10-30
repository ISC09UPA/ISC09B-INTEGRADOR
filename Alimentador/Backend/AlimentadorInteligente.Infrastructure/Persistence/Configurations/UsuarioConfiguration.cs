using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlimentadorInteligente.Infrastructure.Persistence.Configurations;

public class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> b)
    {
        b.Property(u => u.Nombre).HasMaxLength(100).IsRequired();
        b.Property(u => u.Email).HasMaxLength(200).IsRequired();
        b.HasIndex(u => u.Email).IsUnique();
        b.Property(u => u.ExpoPushToken).HasMaxLength(200);
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.Property(r => r.TokenHash).HasMaxLength(64).IsRequired();
        b.HasIndex(r => r.TokenHash).IsUnique();
        b.Ignore(r => r.EstaActivo);
        b.HasOne(r => r.Usuario).WithMany(u => u.RefreshTokens).HasForeignKey(r => r.UsuarioId);
    }
}
