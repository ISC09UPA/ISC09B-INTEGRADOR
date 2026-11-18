using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Pantalla Usuarios de la app: solo admin.
[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/usuarios")]
public class UsuariosController(IUsuarioService servicio) : ApiControllerBase
{
    // GET api/usuarios — usuarios activos: [{ id, usuario, nombre, rol }]
    [HttpGet]
    public async Task<ActionResult<List<UsuarioDto>>> Listar(CancellationToken ct) =>
        Ok(await servicio.ListarAsync(ct));

    // POST api/usuarios — { "nombre": "...", "usuario": "...", "contrasena": "...", "rol": "operador" }
    // 201 con el usuario / 400 / 409 (usuario repetido)
    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> Crear(CrearUsuarioDto dto, CancellationToken ct)
    {
        var resultado = await servicio.CrearAsync(dto, ct);
        return resultado.EsExito
            ? StatusCode(StatusCodes.Status201Created, resultado.Valor)
            : ErrorHttp(resultado);
    }

    // DELETE api/usuarios/3 — baja lógica. 204 / 404 / 409 (uno mismo o el último admin)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DarDeBaja(int id, CancellationToken ct)
    {
        if (UsuarioIdActual() is not int usuarioActual)
            return Unauthorized(new { error = "Necesitas iniciar sesión." });

        var resultado = await servicio.DarDeBajaAsync(id, usuarioActual, ct);
        return resultado.EsExito ? NoContent() : ErrorHttp(resultado);
    }
}
