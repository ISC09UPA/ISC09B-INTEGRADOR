using System.ComponentModel.DataAnnotations;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.DTOs;

/// <summary>Chips de la pantalla 6.</summary>
public enum FiltroVehiculos
{
    Todos = 1,
    Dentro = 2,
    Fuera = 3,
    Baja = 4
}

/// <summary>Una tarjeta de la pantalla 6.</summary>
/// <param name="Placa">Null cuando la placa no fue legible (se muestra el botón "Corregir").</param>
/// <param name="Cajon">Cajón actual si está dentro y estacionado.</param>
/// <param name="UltimaSalida">Para mostrar "Salió 10:02".</param>
public sealed record VehiculoDto(
    Guid Id,
    string? Placa,
    bool PlacaLegible,
    TipoVehiculo Tipo,
    EstadoVehiculo Estado,
    bool Dentro,
    int? Cajon,
    DateTime? UltimaSalida,
    string? CorreoUsuario);

/// <param name="CorreoUsuario">Opcional: liga la placa a la cuenta de un usuario para que vea su historial.</param>
public sealed record AltaVehiculoRequest(
    [Required] string Placa,
    TipoVehiculo Tipo,
    [EmailAddress] string? CorreoUsuario);

public sealed record CorregirPlacaRequest([Required] string Placa);
