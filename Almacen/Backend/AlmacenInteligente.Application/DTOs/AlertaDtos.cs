using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.DTOs;

// Alerta de reorden tal como la ve la app (GET /api/alertas).
// Existencia y PuntoReorden son los valores del momento en que se creó la alerta.
// PedidoId queda en null hasta que existan los pedidos de reabastecimiento.
public record AlertaDto(
    long Id,
    string ProductoId,
    string ProductoNombre,
    int Existencia,
    int PuntoReorden,
    string Estado,          // ACTIVA | ATENDIDA
    DateTime FechaCreacion,
    DateTime? FechaAtencion,
    long? PedidoId);

public static class AlertaMapeo
{
    public static AlertaDto Desde(Alerta a, string? productoNombre = null) => new(
        a.Id,
        a.ProductoId,
        productoNombre ?? a.Producto?.Nombre ?? string.Empty,
        a.Existencia,
        a.PuntoReorden,
        a.Estado,
        DateTime.SpecifyKind(a.CreadaEn, DateTimeKind.Utc),
        a.AtendidaEn is DateTime atendida ? DateTime.SpecifyKind(atendida, DateTimeKind.Utc) : null,
        null);
}
