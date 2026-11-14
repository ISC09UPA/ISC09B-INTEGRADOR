using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>
/// Simula la maqueta sin Raspberry, cámara ni Service Bus. Solo existe en Development y solo para Administrador.
/// Pasa por las mismas reglas que los eventos reales.
/// </summary>
[ApiController]
[Route("api/simulacion")]
[Tags("Simulación")]
[Authorize(Roles = Roles.Administrador)]
public class SimulacionController(IWebHostEnvironment entorno, ISimulacionService simulacion) : ControllerBase
{
    /// <summary>Un auto llega a la pluma con esta placa (null = no legible).</summary>
    [HttpPost("vehiculo-en-pluma")]
    [ProducesResponseType<ResultadoPasoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResultadoPasoDto>> VehiculoEnPluma(SimularVehiculoRequest request) =>
        entorno.IsDevelopment() ? Ok(await simulacion.VehiculoEnPlumaAsync(request)) : NotFound();

    /// <summary>El sensor IR de un cajón cambia de estado.</summary>
    [HttpPost("cajon")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cajon(SimularCajonRequest request)
    {
        if (!entorno.IsDevelopment())
            return NotFound();

        await simulacion.CambiarCajonAsync(request);
        return NoContent();
    }
}
