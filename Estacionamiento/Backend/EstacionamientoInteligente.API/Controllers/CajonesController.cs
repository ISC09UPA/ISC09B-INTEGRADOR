using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Application.Cajones;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Mapa y detalle de cajones. Pantallas 2 y 3. Usuario y Administrador.</summary>
[ApiController]
[Route("api/cajones")]
[Tags("Cajones")]
public class CajonesController : ControllerBase
{
    /// <summary>Los 4 cajones, lugares libres y estado de la pluma.</summary>
    /// <remarks>Los cambios posteriores llegan por SignalR (evento CajonActualizado).</remarks>
    [HttpGet]
    [ProducesResponseType<MapaCajonesDto>(StatusCodes.Status200OK)]
    public ActionResult<MapaCajonesDto> ObtenerMapa() => Ok(DatosEjemplo.Mapa());

    /// <summary>Detalle de un cajón.</summary>
    /// <remarks>
    /// Un usuario solo recibe <c>vehiculo</c> si el cajón es el suyo; el administrador lo recibe siempre.
    /// </remarks>
    /// <response code="404">No existe un cajón con ese número.</response>
    [HttpGet("{numero:int}")]
    [ProducesResponseType<DetalleCajonDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<DetalleCajonDto> ObtenerDetalle(int numero) =>
        DatosEjemplo.Detalle(numero) is { } detalle ? Ok(detalle) : NotFound();
}
