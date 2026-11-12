using AlimentadorInteligente.Domain.Common;

namespace AlimentadorInteligente.Domain.Entities;

public class Usuario : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? ExpoPushToken { get; set; }

    public ICollection<MiembroAlimentador> Alimentadores { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
