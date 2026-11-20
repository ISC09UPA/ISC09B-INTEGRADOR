using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Infrastructure.Auth;

public class JwtTokenService(IConfiguration config) : ITokenService
{
    public string Create(Usuario u)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: [new Claim("sub", u.Id.ToString()), new Claim("name", u.Nombre), new Claim("role", u.Rol.Nombre)],
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
