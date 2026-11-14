using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Panel de estadísticas. Pantalla 5. Solo Administrador.</summary>
[ApiController]
[Route("api/estadisticas")]
[Tags("Estadísticas")]
[Authorize(Roles = Roles.Administrador)]
public class EstadisticasController(IEstadisticasService estadisticas) : ControllerBase
{
    /// <summary>Ocupación actual, entradas del día, estancia promedio y cajón más usado.</summary>
    /// <param name="fecha">Si se omite, hoy.</param>
    [HttpGet("panel")]
    [ProducesResponseType<PanelDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PanelDto>> Panel([FromQuery] DateOnly? fecha) =>
        Ok(await estadisticas.ObtenerPanelAsync(fecha));

    /// <summary>Datos de la gráfica "Ocupación por hora" (las 24 horas, de 0 a 23).</summary>
    [HttpGet("ocupacion-por-hora")]
    [ProducesResponseType<IReadOnlyList<OcupacionHoraDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<OcupacionHoraDto>>> OcupacionPorHora([FromQuery] DateOnly? fecha) =>
        Ok(await estadisticas.ObtenerOcupacionPorHoraAsync(fecha));

    /// <summary>Usos de cada cajón en un rango de fechas. Si se omite, el mes actual.</summary>
    [HttpGet("uso-por-cajon")]
    [ProducesResponseType<IReadOnlyList<UsoCajonDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UsoCajonDto>>> UsoPorCajon([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta) =>
        Ok(await estadisticas.ObtenerUsoPorCajonAsync(desde, hasta));
}
