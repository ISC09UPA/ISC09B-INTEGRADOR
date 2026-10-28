using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Application.Escaner;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Escáner de placas desde el celular. Pantalla 7. Solo Administrador.</summary>
[ApiController]
[Route("api/escaner")]
[Tags("Escáner y pluma")]
public class EscanerController : ControllerBase
{
    /// <summary>
    /// Sube la foto, lee la placa (Computer Vision) y el tipo (Custom Vision).
    /// Solo es una vista previa: no registra entradas ni salidas.
    /// </summary>
    /// <param name="foto">Imagen JPG o PNG, máximo 4 MB.</param>
    /// <response code="400">No se mandó una imagen válida.</response>
    [HttpPost("analizar")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType<AnalisisPlacaDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<AnalisisPlacaDto> Analizar(IFormFile foto) => Ok(DatosEjemplo.Analisis());

    /// <summary>
    /// Registra el paso con la placa confirmada (o corregida) y, si las reglas lo permiten, abre la pluma.
    /// </summary>
    [HttpPost("registrar")]
    [ProducesResponseType<ResultadoPasoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<ResultadoPasoDto> Registrar(RegistrarPasoRequest request) =>
        Ok(DatosEjemplo.ResultadoSalida(request.Placa));
}
