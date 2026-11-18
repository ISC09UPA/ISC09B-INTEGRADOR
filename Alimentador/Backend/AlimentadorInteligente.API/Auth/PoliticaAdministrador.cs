using System.IdentityModel.Tokens.Jwt;
using AlimentadorInteligente.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.API.Auth;

/// <summary>Requisito de la política "Administrador" que protege /api/admin.</summary>
public class RequisitoAdministrador : IAuthorizationRequirement
{
    public const string Politica = "Administrador";
}

/// <summary>
/// Lee de la BD en cada petición que el usuario del JWT siga siendo administrador y esté activo,
/// para que quitar el rol o desactivar la cuenta surta efecto sin esperar a que venza el access token.
/// </summary>
public class AdministradorAuthorizationHandler(IAppDbContext db) : AuthorizationHandler<RequisitoAdministrador>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, RequisitoAdministrador requirement)
    {
        if (!int.TryParse(context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var usuarioId))
            return;

        var ct = (context.Resource as HttpContext)?.RequestAborted ?? CancellationToken.None;
        bool esAdministrador = await db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Id == usuarioId && u.EsAdministrador && u.Activo, ct);
        if (esAdministrador)
            context.Succeed(requirement);
    }
}
