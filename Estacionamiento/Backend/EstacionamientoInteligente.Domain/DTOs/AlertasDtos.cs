using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.DTOs;

/// <summary>Aviso amarillo de la pantalla 5 ("Entrada negada · 11:05").</summary>
/// <param name="VehiculoId">Para ir directo a corregir la placa desde la alerta.</param>
public sealed record AlertaDto(
    Guid Id,
    TipoAlerta Tipo,
    string Mensaje,
    string? Placa,
    string? FotoUrl,
    Guid? VehiculoId,
    DateTime Fecha,
    bool Atendida);
