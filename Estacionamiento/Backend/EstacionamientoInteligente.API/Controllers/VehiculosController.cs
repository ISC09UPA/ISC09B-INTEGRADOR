using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Gestión de vehículos. Pantalla 6. Solo Administrador.</summary>
[ApiController]
[Route("api/vehiculos")]
[Tags("Vehículos")]
[Authorize(Roles = Roles.Administrador)]
public class VehiculosController(IVehiculosService vehiculos) : ControllerBase
{
    /// <summary>Lista con búsqueda por placa (parcial) y filtro.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<VehiculoDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehiculoDto>>> Listar(
        [FromQuery] string? placa,
        [FromQuery] FiltroVehiculos filtro = FiltroVehiculos.Todos) =>
        Ok(await vehiculos.ListarAsync(placa, filtro));

    /// <summary>Da de alta un vehículo.</summary>
    /// <response code="400">La placa no es válida.</response>
    /// <response code="404">No existe un usuario con ese correo.</response>
    /// <response code="409">Ya existe un vehículo con esa placa.</response>
    [HttpPost]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VehiculoDto>> DarDeAlta(AltaVehiculoRequest request) =>
        StatusCode(StatusCodes.Status201Created, await vehiculos.DarDeAltaAsync(request));

    /// <summary>Da de baja un vehículo. No le impide entrar: solo cambia su registro.</summary>
    /// <response code="409">Ya estaba dado de baja.</response>
    [HttpPatch("{id:guid}/baja")]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VehiculoDto>> DarDeBaja(Guid id) =>
        Ok(await vehiculos.DarDeBajaAsync(id));

    /// <summary>Reactiva un vehículo dado de baja.</summary>
    /// <response code="409">Ya estaba activo.</response>
    [HttpPatch("{id:guid}/reactivar")]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VehiculoDto>> Reactivar(Guid id) =>
        Ok(await vehiculos.ReactivarAsync(id));

    /// <summary>Corrige la placa de un vehículo (por ejemplo, una "placa no legible") y atiende su alerta.</summary>
    /// <response code="400">La placa no es válida.</response>
    /// <response code="409">Ya existe otro vehículo con esa placa.</response>
    [HttpPatch("{id:guid}/placa")]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VehiculoDto>> CorregirPlaca(Guid id, CorregirPlacaRequest request) =>
        Ok(await vehiculos.CorregirPlacaAsync(id, request, User.ObtenerId()));
}
