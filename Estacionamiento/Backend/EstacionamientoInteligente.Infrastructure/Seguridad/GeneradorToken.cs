using System.Security.Claims;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace EstacionamientoInteligente.Infrastructure.Seguridad;

/// <summary>
/// Crea el JWT que recibe la app al hacer login. Lleva estos datos (claims):
/// <list type="bullet">
///   <item><c>sub</c>: id del usuario (Guid)</item>
///   <item><c>email</c> y <c>name</c>: correo y nombre</item>
///   <item><c>role</c>: "Usuario" o "Administrador", para <c>[Authorize(Roles = ...)]</c></item>
/// </list>
/// Va firmado con <see cref="OpcionesJwt.Clave"/>; si alguien lo modifica, la API lo rechaza (401).
/// </summary>
public class GeneradorToken(IOptions<OpcionesJwt> opciones, TimeProvider reloj) : IGeneradorToken
{
    private readonly OpcionesJwt _opciones = opciones.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public TokenGenerado Generar(Usuario usuario)
    {
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var expira = ahora.AddMinutes(_opciones.MinutosExpiracion);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _opciones.Emisor,
            Audience = _opciones.Audiencia,
            IssuedAt = ahora,
            NotBefore = ahora,
            Expires = expira,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, usuario.Correo),
                new Claim(JwtRegisteredClaimNames.Name, usuario.Nombre),
                new Claim(ClaimesJwt.Rol, usuario.Rol.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            ]),
            SigningCredentials = new SigningCredentials(_opciones.ObtenerLlave(), SecurityAlgorithms.HmacSha256)
        };

        return new TokenGenerado(_handler.CreateToken(descriptor), expira);
    }
}

/// <summary>Nombres cortos de los claims, para leerlos igual en toda la API.</summary>
public static class ClaimesJwt
{
    public const string IdUsuario = JwtRegisteredClaimNames.Sub;
    public const string Nombre = JwtRegisteredClaimNames.Name;
    public const string Rol = "role";
}
