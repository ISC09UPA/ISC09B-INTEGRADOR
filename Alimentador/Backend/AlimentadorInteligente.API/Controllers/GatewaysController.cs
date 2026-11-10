using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

/// <summary>Alta de las Raspberry Pi. La clave se devuelve una sola vez; en la BD solo queda su hash.</summary>
[ApiController]
[Authorize]
[Route("api/gateways")]
public class GatewaysController(IGatewayService gateways) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GatewayDto>>> Listar(CancellationToken ct)
        => Ok(await gateways.ListarAsync(ct));

    [HttpPost]
    public async Task<ActionResult<GatewayClaveResponse>> Crear(CrearGatewayRequest request, CancellationToken ct)
        => Ok(await gateways.CrearAsync(request, ct));

    [HttpPost("{id:int}/regenerar-clave")]
    public async Task<ActionResult<GatewayClaveResponse>> RegenerarClave(int id, CancellationToken ct)
        => Ok(await gateways.RegenerarClaveAsync(id, ct));
}
