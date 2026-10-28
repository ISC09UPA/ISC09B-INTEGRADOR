using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Application.Escaner;
using EstacionamientoInteligente.Application.Simulacion;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>
/// Simula la maqueta sin Raspberry, cámara ni Service Bus. Solo existe en Development.
/// Pasa por las mismas reglas que los eventos reales.
/// </summary>
[ApiController]
[Route("api/simulacion")]
[Tags("Simulación")]
public class SimulacionController(IWebHostEnvironment entorno) : ControllerBase
{
    /// <summary>Un auto llega a la pluma con esta placa (null = no legible).</summary>
    [HttpPost("vehiculo-en-pluma")]
    [ProducesResponseType<ResultadoPasoDto>(StatusCodes.Status200OK)]
    public ActionResult<ResultadoPasoDto> VehiculoEnPluma(SimularVehiculoRequest request) =>
        entorno.IsDevelopment() ? Ok(DatosEjemplo.ResultadoEntrada(request.Placa)) : NotFound();

    /// <summary>El sensor IR de un cajón cambia de estado.</summary>
    [HttpPost("cajon")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Cajon(SimularCajonRequest request) =>
        entorno.IsDevelopment() ? NoContent() : NotFound();
}
