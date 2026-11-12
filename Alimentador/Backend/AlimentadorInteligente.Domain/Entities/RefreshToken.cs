using AlimentadorInteligente.Domain.Common;

namespace AlimentadorInteligente.Domain.Entities;

public class RefreshToken : EntidadBase
{
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiraEn { get; set; }
    public DateTimeOffset? RevocadoEn { get; set; }

    public bool EstaActivo => RevocadoEn is null && ExpiraEn > DateTimeOffset.UtcNow;
}
