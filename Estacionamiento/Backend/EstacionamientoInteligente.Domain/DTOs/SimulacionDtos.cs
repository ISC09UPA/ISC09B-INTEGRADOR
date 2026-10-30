using System.ComponentModel.DataAnnotations;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.DTOs;

/// <summary>Simula que un auto llegó a la pluma, sin cámara ni Service Bus.</summary>
/// <param name="Placa">Null simula una placa no legible.</param>
public sealed record SimularVehiculoRequest(string? Placa, TipoVehiculo Tipo);

/// <summary>Simula la lectura de un sensor IR.</summary>
public sealed record SimularCajonRequest([Range(1, 4)] int Numero, bool Ocupado);
