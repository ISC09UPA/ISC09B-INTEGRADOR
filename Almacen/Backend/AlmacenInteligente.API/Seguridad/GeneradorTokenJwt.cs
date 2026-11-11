using System.IdentityModel.Tokens.Jwt;
using System.Text;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace AlmacenInteligente.API.Seguridad;

public class GeneradorTokenJwt(JwtOpciones opciones) : IGeneradorToken
{
    public TokenGenerado Generar(Usuario usuario)
    {
        var expira = DateTime.UtcNow.AddMinutes(opciones.MinutosExpiracion);

        var claims = new List<System.Security.Claims.Claim>
        {
            new(TiposClaim.Id, usuario.Id.ToString()),
            new(TiposClaim.Usuario, usuario.NombreUsuario),
            new(TiposClaim.Rol, usuario.Rol),
            new(TiposClaim.Nombre, usuario.Nombre)
        };

        var llave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opciones.Key));
        var token = new JwtSecurityToken(
            issuer: opciones.Issuer,
            audience: opciones.Audience,
            claims: claims,
            expires: expira,
            signingCredentials: new SigningCredentials(llave, SecurityAlgorithms.HmacSha256));

        return new TokenGenerado(new JwtSecurityTokenHandler().WriteToken(token), expira);
    }
}
