using System.Security.Claims;
using InvernaderoInteligente.Application.DTOs;
using InvernaderoInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InvernaderoInteligente.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("registro")]
    public async Task<IActionResult> Registrar([FromBody] RegisterRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.correo) || string.IsNullOrWhiteSpace(request.contrasena))
        {
            return BadRequest(new { mensaje = "Correo y contraseña son obligatorios." });
        }

        var resultado = await _authService.RegisterAsync(request);

        if (resultado == null)
        {
            return Conflict(new { mensaje = "Este correo ya está registrado." });
        }

        return Ok(resultado);
    }

    [HttpPost("login")]
    public async Task<IActionResult> IniciarSesion([FromBody] LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.correo) || string.IsNullOrWhiteSpace(request.contrasena))
        {
            return BadRequest(new { mensaje = "Correo y contraseña son obligatorios." });
        }

        var resultado = await _authService.LoginAsync(request);

        if (resultado == null)
        {
            return Unauthorized(new { mensaje = "Correo o contraseña incorrectos." });
        }

        return Ok(resultado);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> MiPerfil()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(idClaim, out var id_Usuario))
        {
            return Unauthorized(new { mensaje = "Token inválido." });
        }

        var usuario = await _authService.GetByIdAsync(id_Usuario);

        if (usuario == null)
        {
            return NotFound(new { mensaje = "Usuario no encontrado." });
        }

        return Ok(usuario);
    }
}
