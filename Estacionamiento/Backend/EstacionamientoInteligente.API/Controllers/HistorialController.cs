using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Application.Historial;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Accesos del usuario que inició sesión. Pantalla 4. Solo Usuario.</summary>
[ApiController]
[Route("api/historial")]
[Tags("Historial")]
public class HistorialController : ControllerBase
{
    /// <summary>Lista de entradas y salidas, de la más reciente a la más antigua.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<HistorialItemDto>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<HistorialItemDto>> Listar([FromQuery] PeriodoHistorial periodo = PeriodoHistorial.Semana) =>
        Ok(DatosEjemplo.Historial());

    /// <summary>El acceso en curso ("Tu auto está en el cajón 3").</summary>
    /// <response code="204">El usuario no tiene ningún auto dentro.</response>
    [HttpGet("actual")]
    [ProducesResponseType<AccesoActualDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public ActionResult<AccesoActualDto> Actual() => Ok(DatosEjemplo.AccesoActual());

    /// <summary>Visitas, estancia promedio y cajón frecuente de un mes.</summary>
    /// <param name="mes">Formato "2026-10". Si se omite, el mes actual.</param>
    [HttpGet("resumen")]
    [ProducesResponseType<ResumenMesDto>(StatusCodes.Status200OK)]
    public ActionResult<ResumenMesDto> Resumen([FromQuery] string? mes) =>
        Ok(DatosEjemplo.Resumen(mes ?? DateTime.Today.ToString("yyyy-MM")));
}
