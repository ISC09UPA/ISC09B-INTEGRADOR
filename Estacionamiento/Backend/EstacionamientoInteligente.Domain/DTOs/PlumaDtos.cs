using System.ComponentModel.DataAnnotations;

namespace EstacionamientoInteligente.Domain.DTOs;

public sealed record AbrirPlumaRequest([StringLength(200)] string? Motivo);

public sealed record EstadoPlumaDto(bool Abierta, DateTime UltimoCambio);
