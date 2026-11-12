using System.IdentityModel.Tokens.Jwt;
using AlimentadorInteligente.Application.Abstractions;

namespace AlimentadorInteligente.API.Auth;

public class UsuarioActual(IHttpContextAccessor accessor) : IUsuarioActual
{
    public int Id => int.TryParse(accessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id)
        ? id
        : throw new UnauthorizedAccessException("No hay un usuario autenticado.");
}
