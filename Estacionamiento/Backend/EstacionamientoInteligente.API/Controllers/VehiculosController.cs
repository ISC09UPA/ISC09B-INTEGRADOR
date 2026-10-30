using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Gestión de vehículos. Pantalla 6. Solo Administrador.</summary>
[ApiController]
[Route("api/vehiculos")]
[Tags("Vehículos")]
public class VehiculosController : ControllerBase
{
    /// <summary>Lista con búsqueda por placa (parcial) y filtro.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<VehiculoDto>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<VehiculoDto>> Listar(
        [FromQuery] string? placa,
        [FromQuery] FiltroVehiculos filtro = FiltroVehiculos.Todos) =>
        Ok(DatosEjemplo.Vehiculos());

    /// <summary>Da de alta un vehículo.</summary>
    /// <response code="400">La placa no es válida.</response>
    /// <response code="404">No existe un usuario con ese correo.</response>
    /// <response code="409">Ya existe un vehículo con esa placa.</response>
    [HttpPost]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<VehiculoDto> DarDeAlta(AltaVehiculoRequest request)
    {
        var vehiculo = new VehiculoDto(Guid.NewGuid(), request.Placa.ToUpperInvariant(), true, request.Tipo,
            EstadoVehiculo.Alta, false, null, null, request.CorreoUsuario);
        return StatusCode(StatusCodes.Status201Created, vehiculo);
    }

    /// <summary>Da de baja un vehículo. No le impide entrar: solo cambia su registro.</summary>
    /// <response code="409">Ya estaba dado de baja.</response>
    [HttpPatch("{id:guid}/baja")]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<VehiculoDto> DarDeBaja(Guid id) =>
        Ok(DatosEjemplo.Vehiculos()[0] with { Id = id, Estado = EstadoVehiculo.Baja });

    /// <summary>Reactiva un vehículo dado de baja.</summary>
    /// <response code="409">Ya estaba activo.</response>
    [HttpPatch("{id:guid}/reactivar")]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<VehiculoDto> Reactivar(Guid id) =>
        Ok(DatosEjemplo.Vehiculos()[4] with { Id = id, Estado = EstadoVehiculo.Alta });

    /// <summary>Corrige la placa de un vehículo (por ejemplo, una "placa no legible").</summary>
    /// <response code="400">La placa no es válida.</response>
    /// <response code="409">Ya existe otro vehículo con esa placa.</response>
    [HttpPatch("{id:guid}/placa")]
    [ProducesResponseType<VehiculoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<VehiculoDto> CorregirPlaca(Guid id, CorregirPlacaRequest request) =>
        Ok(DatosEjemplo.Vehiculos()[1] with { Id = id, Placa = request.Placa.ToUpperInvariant(), PlacaLegible = true });
}
