using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using AlimentadorInteligente.Application.Abstractions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AlimentadorInteligente.API.Auth;

/// <summary>
/// Autenticación de la Raspberry Pi con X-Device-Id y X-Device-Key (RNF-07).
/// La clave se guarda como hash SHA-256 en la tabla Gateways.
/// </summary>
public class DeviceKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IAppDbContext db,
    ITokenService tokens) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Esquema = "DeviceKey";
    public const string ClaimGatewayId = "gateway_id";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Device-Id", out var deviceId) ||
            !Request.Headers.TryGetValue("X-Device-Key", out var deviceKey))
            return AuthenticateResult.NoResult();

        var id = deviceId.ToString();
        var gateway = await db.Gateways.AsNoTracking()
            .FirstOrDefaultAsync(g => g.DeviceId == id, Context.RequestAborted);

        var hash = tokens.Hash(deviceKey.ToString());
        if (gateway is null || !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(hash), Encoding.UTF8.GetBytes(gateway.DeviceKeyHash)))
            return AuthenticateResult.Fail("Credenciales de dispositivo inválidas.");

        var identidad = new ClaimsIdentity(
            [new Claim(ClaimGatewayId, gateway.Id.ToString()), new Claim(ClaimTypes.Name, gateway.DeviceId)], Esquema);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identidad), Esquema));
    }
}
