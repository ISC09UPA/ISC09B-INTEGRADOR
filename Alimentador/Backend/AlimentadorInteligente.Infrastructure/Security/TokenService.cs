using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Infrastructure.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AlimentadorInteligente.Infrastructure.Security;

public class TokenService(IOptions<JwtOptions> opciones) : ITokenService
{
    private readonly JwtOptions _jwt = opciones.Value;

    public (string token, DateTimeOffset expiraEn) GenerarAccessToken(Usuario usuario)
    {
        var expira = DateTimeOffset.UtcNow.AddMinutes(_jwt.AccessTokenMinutos);
        var credenciales = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key)), SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
                new Claim(JwtRegisteredClaimNames.Name, usuario.Nombre)
            ],
            expires: expira.UtcDateTime,
            signingCredentials: credenciales);

        return (new JwtSecurityTokenHandler().WriteToken(token), expira);
    }

    public string GenerarRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public string Hash(string valor) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(valor)));
}
