using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.DTOs;

/// <summary>Pantalla 2: mapa del estacionamiento.</summary>
public sealed record MapaCajonesDto(
    int Libres,
    int Total,
    bool PlumaAbierta,
    IReadOnlyList<CajonDto> Cajones);

/// <param name="EsMio">True si ahí está el auto del usuario que consulta.</param>
public sealed record CajonDto(int Numero, EstadoCajon Estado, bool EsMio);

/// <summary>
/// Pantalla 3: detalle de cajón. <see cref="Vehiculo"/> es null si el cajón está libre
/// o si un usuario consulta un cajón que no es el suyo.
/// </summary>
public sealed record DetalleCajonDto(
    int Numero,
    EstadoCajon Estado,
    bool EsMio,
    VehiculoEnCajonDto? Vehiculo);

/// <param name="FotoUrl">URL temporal (SAS) de la foto de entrada en Blob Storage.</param>
/// <param name="HoraSalida">Null mientras el auto sigue dentro ("Pendiente").</param>
public sealed record VehiculoEnCajonDto(
    string? Placa,
    TipoVehiculo Tipo,
    string FotoUrl,
    DateTime HoraEntrada,
    DateTime? HoraSalida,
    int MinutosEstancia);
