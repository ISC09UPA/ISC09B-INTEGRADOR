using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Login y cuenta. Pantalla 1.</summary>
[ApiController]
[Route("api/auth")]
[Tags("Auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    /// <summary>Inicia sesión con el rol elegido en el selector. Público.</summary>
    /// <response code="401">Correo o contraseña incorrectos, o el rol no coincide con la cuenta.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType<TokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TokenResponse>> Login(LoginRequest request) =>
        Ok(await auth.IniciarSesionAsync(request));

    /// <summary>Crea una cuenta con rol Usuario. Público.</summary>
    /// <response code="409">Ya existe una cuenta con ese correo.</response>
    [HttpPost("registro")]
    [AllowAnonymous]
    [ProducesResponseType<TokenResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TokenResponse>> Registro(RegistroRequest request) =>
        StatusCode(StatusCodes.Status201Created, await auth.RegistrarAsync(request));

    /// <summary>Datos de quien inició sesión y sus placas. Usuario y Administrador.</summary>
    [HttpGet("yo")]
    [Authorize]
    [ProducesResponseType<UsuarioDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UsuarioDto>> Yo() =>
        Ok(await auth.ObtenerPerfilAsync(User.ObtenerId()));
}
