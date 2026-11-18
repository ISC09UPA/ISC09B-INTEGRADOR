using AlimentadorInteligente.API.Auth;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

/// <summary>Cuentas de usuario: rol de administrador y activación.</summary>
[ApiController]
[Authorize(Policy = RequisitoAdministrador.Politica)]
[Route("api/admin/usuarios")]
public class AdminUsuariosController(IAdminUsuarioService usuarios) : ControllerBase
{
    /// <summary>Lista paginada; buscar filtra por nombre o correo.</summary>
    [HttpGet]
    public async Task<ActionResult<Pagina<UsuarioAdminDto>>> Listar([FromQuery] ConsultaUsuarios consulta, CancellationToken ct)
        => Ok(await usuarios.ListarAsync(consulta, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioAdminDetalleDto>> Obtener(int id, CancellationToken ct)
        => Ok(await usuarios.ObtenerAsync(id, ct));

    /// <summary>Da o quita el rol; surte efecto de inmediato en /api/admin.</summary>
    [HttpPut("{id:int}/administrador")]
    public async Task<ActionResult<UsuarioAdminDto>> CambiarAdministrador(int id, CambiarAdministradorRequest request, CancellationToken ct)
        => Ok(await usuarios.CambiarAdministradorAsync(id, request, ct));

    /// <summary>Activa o desactiva la cuenta; desactivar revoca sus refresh tokens.</summary>
    [HttpPut("{id:int}/activo")]
    public async Task<ActionResult<UsuarioAdminDto>> CambiarActivo(int id, CambiarActivoRequest request, CancellationToken ct)
        => Ok(await usuarios.CambiarActivoAsync(id, request, ct));
}
