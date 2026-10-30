using System.Security.Claims;
using AlimentadorInteligente.API.Auth;

namespace AlimentadorInteligente.API.Extensions;

public static class ClaimsExtensions
{
    public static int GatewayId(this ClaimsPrincipal user)
        => int.Parse(user.FindFirstValue(DeviceKeyAuthenticationHandler.ClaimGatewayId)
                     ?? throw new UnauthorizedAccessException("La petición no viene de un gateway."));
}
