using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Application.Auth;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Login y cuenta. Pantalla 1.</summary>
[ApiController]
[Route("api/auth")]
[Tags("Auth")]
public class AuthController : ControllerBase
{
    /// <summary>Inicia sesión con el rol elegido en el selector. Público.</summary>
    /// <response code="401">Correo o contraseña incorrectos, o el rol no coincide con la cuenta.</response>
    [HttpPost("login")]
    [ProducesResponseType<TokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<TokenResponse> Login(LoginRequest request) =>
        Ok(DatosEjemplo.Token(request.Rol));

    /// <summary>Crea una cuenta con rol Usuario. Público.</summary>
    /// <response code="409">Ya existe una cuenta con ese correo.</response>
    [HttpPost("registro")]
    [ProducesResponseType<TokenResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<TokenResponse> Registro(RegistroRequest request) =>
        StatusCode(StatusCodes.Status201Created, DatosEjemplo.Token(Domain.Enums.RolUsuario.Usuario));

    /// <summary>Datos de quien inició sesión y sus placas. Usuario y Administrador.</summary>
    [HttpGet("yo")]
    [ProducesResponseType<UsuarioDto>(StatusCodes.Status200OK)]
    public ActionResult<UsuarioDto> Yo() => Ok(DatosEjemplo.Usuario());
}
