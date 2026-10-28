using System.ComponentModel.DataAnnotations;

namespace EstacionamientoInteligente.Application.Pluma;

public sealed record AbrirPlumaRequest([StringLength(200)] string? Motivo);

public sealed record EstadoPlumaDto(bool Abierta, DateTime UltimoCambio);
