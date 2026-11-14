using System.Security.Claims;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Infrastructure.Seguridad;

namespace EstacionamientoInteligente.API.Comun;

/// <summary>Nombres de rol para <c>[Authorize(Roles = ...)]</c>; coinciden con <see cref="RolUsuario"/>.</summary>
public static class Roles
{
    public const string Usuario = nameof(RolUsuario.Usuario);
    public const string Administrador = nameof(RolUsuario.Administrador);
}

/// <summary>Datos de quien hizo la petición, sacados de su token.</summary>
public static class UsuarioActual
{
    /// <summary>El id del claim <c>sub</c>. Si el token no lo trae, 401.</summary>
    public static Guid ObtenerId(this ClaimsPrincipal usuario) =>
        Guid.TryParse(usuario.FindFirstValue(ClaimesJwt.IdUsuario), out var id)
            ? id
            : throw new ExcepcionNoAutenticado("El token no trae el id del usuario.");

    public static bool EsAdministrador(this ClaimsPrincipal usuario) => usuario.IsInRole(Roles.Administrador);
}
