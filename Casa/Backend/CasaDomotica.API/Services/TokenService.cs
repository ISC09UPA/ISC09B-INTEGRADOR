using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace CasaDomotica.API.Services;

public sealed class TokenService
{
    private readonly SymmetricSecurityKey _clave;

    public TokenService(SymmetricSecurityKey clave)
    {
        _clave = clave;
    }

    public string Crear(string nombre)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, nombre) }),
            Expires = DateTime.UtcNow.AddHours(12),
            SigningCredentials = new SigningCredentials(_clave, SecurityAlgorithms.HmacSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
