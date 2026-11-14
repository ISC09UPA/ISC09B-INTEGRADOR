using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Accesos del usuario que inició sesión. Pantalla 4. Solo Usuario.</summary>
[ApiController]
[Route("api/historial")]
[Tags("Historial")]
[Authorize(Roles = Roles.Usuario)]
public class HistorialController(IHistorialService historial) : ControllerBase
{
    /// <summary>Lista de entradas y salidas, de la más reciente a la más antigua.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<HistorialItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<HistorialItemDto>>> Listar([FromQuery] PeriodoHistorial periodo = PeriodoHistorial.Semana) =>
        Ok(await historial.ListarAsync(User.ObtenerId(), periodo));

    /// <summary>El acceso en curso ("Tu auto está en el cajón 3").</summary>
    /// <response code="204">El usuario no tiene ningún auto dentro.</response>
    [HttpGet("actual")]
    [ProducesResponseType<AccesoActualDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult<AccesoActualDto>> Actual() =>
        await historial.ObtenerActualAsync(User.ObtenerId()) is { } actual ? Ok(actual) : NoContent();

    /// <summary>Visitas, estancia promedio y cajón frecuente de un mes.</summary>
    /// <param name="mes">Formato "2026-10". Si se omite, el mes actual.</param>
    /// <response code="400">El mes no tiene el formato "AAAA-MM".</response>
    [HttpGet("resumen")]
    [ProducesResponseType<ResumenMesDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ResumenMesDto>> Resumen([FromQuery] string? mes) =>
        Ok(await historial.ObtenerResumenMesAsync(User.ObtenerId(), mes));
}
