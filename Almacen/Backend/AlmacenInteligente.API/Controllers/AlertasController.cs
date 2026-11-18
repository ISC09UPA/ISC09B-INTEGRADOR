using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Alertas de reorden. Consultar: cualquier usuario con sesión. Marcar como atendida: solo admin.
// Las alertas las crea el backend (lecturas del sensor y movimientos manuales), nunca la app.
[ApiController]
[Authorize]
[Route("api/alertas")]
public class AlertasController(IAlertaService servicio) : ApiControllerBase
{
    // GET api/alertas?estado=ACTIVA&limite=50 — estado: ACTIVA, ATENDIDA u omitido (todas)
    [HttpGet]
    public async Task<ActionResult<List<AlertaDto>>> Listar(
        [FromQuery] string? estado, [FromQuery] int? limite, CancellationToken ct)
    {
        var resultado = await servicio.ListarAsync(estado, limite, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // PUT api/alertas/1/atender — 200 con la alerta / 404 / 409 (ya estaba atendida)
    [HttpPut("{id:long}/atender")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<AlertaDto>> Atender(long id, CancellationToken ct)
    {
        var resultado = await servicio.AtenderAsync(id, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }
}
