using AlimentadorInteligente.Domain.Entities;

namespace AlimentadorInteligente.Application.Abstractions;

public interface ITokenService
{
    (string token, DateTimeOffset expiraEn) GenerarAccessToken(Usuario usuario);
    /// <summary>Genera un refresh token aleatorio; solo se guarda su hash.</summary>
    string GenerarRefreshToken();
    string Hash(string valor);
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verificar(string password, string hash);
}
