using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Application.Estadisticas;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Panel de estadísticas. Pantalla 5. Solo Administrador.</summary>
[ApiController]
[Route("api/estadisticas")]
[Tags("Estadísticas")]
public class EstadisticasController : ControllerBase
{
    /// <summary>Ocupación actual, entradas del día, estancia promedio y cajón más usado.</summary>
    /// <param name="fecha">Si se omite, hoy.</param>
    [HttpGet("panel")]
    [ProducesResponseType<PanelDto>(StatusCodes.Status200OK)]
    public ActionResult<PanelDto> Panel([FromQuery] DateOnly? fecha) =>
        Ok(DatosEjemplo.Panel(fecha ?? DateOnly.FromDateTime(DateTime.Today)));

    /// <summary>Datos de la gráfica "Ocupación por hora".</summary>
    [HttpGet("ocupacion-por-hora")]
    [ProducesResponseType<IReadOnlyList<OcupacionHoraDto>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<OcupacionHoraDto>> OcupacionPorHora([FromQuery] DateOnly? fecha) =>
        Ok(DatosEjemplo.OcupacionPorHora());

    /// <summary>Usos de cada cajón en un rango de fechas. Si se omite, el mes actual.</summary>
    [HttpGet("uso-por-cajon")]
    [ProducesResponseType<IReadOnlyList<UsoCajonDto>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<UsoCajonDto>> UsoPorCajon([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta) =>
        Ok(DatosEjemplo.UsoPorCajon());
}
