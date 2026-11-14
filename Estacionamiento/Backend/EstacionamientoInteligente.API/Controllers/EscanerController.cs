using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Escáner de placas desde el celular. Pantalla 7. Solo Administrador.</summary>
[ApiController]
[Route("api/escaner")]
[Tags("Escáner y pluma")]
[Authorize(Roles = Roles.Administrador)]
public class EscanerController(IEscanerService escaner) : ControllerBase
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
    public async Task<ActionResult<AnalisisPlacaDto>> Analizar(IFormFile foto)
    {
        await using var contenido = foto.OpenReadStream();
        return Ok(await escaner.AnalizarAsync(contenido, foto.ContentType));
    }

    /// <summary>
    /// Registra el paso con la placa confirmada (o corregida) y, si las reglas lo permiten, abre la pluma.
    /// </summary>
    [HttpPost("registrar")]
    [ProducesResponseType<ResultadoPasoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ResultadoPasoDto>> Registrar(RegistrarPasoRequest request) =>
        Ok(await escaner.RegistrarAsync(request));
}
