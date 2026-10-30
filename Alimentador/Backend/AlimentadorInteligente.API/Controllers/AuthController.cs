using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("registro")]
    public async Task<ActionResult<AuthResponse>> Registrar(RegistroRequest request, CancellationToken ct)
        => Ok(await auth.RegistrarAsync(request, ct));

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
        => Ok(await auth.LoginAsync(request, ct));

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct)
        => Ok(await auth.RefreshAsync(request, ct));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request, ct);
        return NoContent();
    }

    /// <summary>Registra el token de Expo del celular para recibir notificaciones push.</summary>
    [Authorize]
    [HttpPut("push-token")]
    public async Task<IActionResult> GuardarPushToken(PushTokenRequest request, CancellationToken ct)
    {
        await auth.GuardarPushTokenAsync(request, ct);
        return NoContent();
    }
}
