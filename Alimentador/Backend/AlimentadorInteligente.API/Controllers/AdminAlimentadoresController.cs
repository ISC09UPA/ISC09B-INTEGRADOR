using AlimentadorInteligente.API.Auth;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

/// <summary>Cualquier alimentador, sin ser su miembro.</summary>
[ApiController]
[Authorize(Policy = RequisitoAdministrador.Politica)]
[Route("api/admin/alimentadores")]
public class AdminAlimentadoresController(IAdminAlimentadorService alimentadores) : ControllerBase
{
    /// <summary>Lista paginada; estado = todos | enLinea | sinConexion | sinGateway.</summary>
    [HttpGet]
    public async Task<ActionResult<Pagina<AlimentadorAdminDto>>> Listar([FromQuery] ConsultaAlimentadores consulta, CancellationToken ct)
        => Ok(await alimentadores.ListarAsync(consulta, ct));

    /// <summary>Detalle con miembros, mascotas (también las dadas de baja), horarios y los últimos comandos y alertas.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AlimentadorAdminDetalleDto>> Obtener(int id, CancellationToken ct)
        => Ok(await alimentadores.ObtenerAsync(id, ct));
}
