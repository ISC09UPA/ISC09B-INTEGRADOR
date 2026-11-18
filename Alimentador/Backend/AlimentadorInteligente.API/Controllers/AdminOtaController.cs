using AlimentadorInteligente.API.Auth;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

/// <summary>Despliegues OTA a varios alimentadores sin ser su dueño.</summary>
[ApiController]
[Authorize(Policy = RequisitoAdministrador.Politica)]
[Route("api/admin/ota/despliegues")]
public class AdminOtaController(IAdminOtaService ota) : ControllerBase
{
    /// <summary>Crea un comando OTA por alimentador; los que no aplican vuelven en omitidos con su motivo.</summary>
    [HttpPost]
    public async Task<ActionResult<DespliegueOtaResponse>> Desplegar(CrearDespliegueOtaRequest request, CancellationToken ct)
        => Ok(await ota.DesplegarAsync(request, ct));

    [HttpGet]
    public async Task<ActionResult<Pagina<ComandoAdminDto>>> Listar([FromQuery] ConsultaDespliegues consulta, CancellationToken ct)
        => Ok(await ota.ListarAsync(consulta, ct));

    /// <summary>Solo una OTA pendiente; 409 si ya se entregó o terminó.</summary>
    [HttpPost("{id:int}/cancelar")]
    public async Task<ActionResult<ComandoAdminDto>> Cancelar(int id, CancellationToken ct)
        => Ok(await ota.CancelarAsync(id, ct));
}
