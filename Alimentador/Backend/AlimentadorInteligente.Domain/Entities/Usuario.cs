using AlimentadorInteligente.Domain.Common;

namespace AlimentadorInteligente.Domain.Entities;

public class Usuario : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? ExpoPushToken { get; set; }
    /// <summary>Acceso al panel de administración (/api/admin) y a la publicación de artefactos OTA.</summary>
    public bool EsAdministrador { get; set; }
    /// <summary>Una cuenta desactivada no puede iniciar sesión ni renovar tokens.</summary>
    public bool Activo { get; set; } = true;
    /// <summary>Último inicio de sesión o renovación de tokens.</summary>
    public DateTimeOffset? UltimoAcceso { get; set; }

    public ICollection<MiembroAlimentador> Alimentadores { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
