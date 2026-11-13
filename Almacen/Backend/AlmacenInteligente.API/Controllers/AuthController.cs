using AlmacenInteligente.API.Seguridad;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService servicio) : ApiControllerBase
{
    // POST api/auth/login — { "usuario": "...", "contrasena": "..." } -> 200 con token / 400 / 401
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginRespuestaDto>> Login(LoginDto dto, CancellationToken ct)
    {
        var resultado = await servicio.LoginAsync(dto, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // GET api/auth/yo — quién es el dueño del token (sirve para probar que el token funciona)
    [HttpGet("yo")]
    [Authorize]
    public ActionResult<UsuarioSesionDto> Yo()
    {
        var id = int.TryParse(User.FindFirst(TiposClaim.Id)?.Value, out var n) ? n : 0;
        return Ok(new UsuarioSesionDto(
            id,
            User.FindFirst(TiposClaim.Usuario)?.Value ?? string.Empty,
            User.FindFirst(TiposClaim.Nombre)?.Value ?? string.Empty,
            User.FindFirst(TiposClaim.Rol)?.Value ?? string.Empty));
    }
}
