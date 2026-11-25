using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.DTOs;

// Cuerpo de POST /api/movimientos (registro manual).
// El usuario sale del token, nunca del cuerpo. TipoMovimiento acepta mayúsculas o minúsculas.
public record RegistrarMovimientoDto(string? ProductoId, string? TipoMovimiento, int Cantidad);

public record MovimientoDto(
    long Id,
    string ProductoId,
    string ProductoNombre,
    string TipoMovimiento, // ENTRADA | SALIDA
    int Cantidad,
    string Origen,         // SENSOR | CAMARA | MANUAL | PEDIDO
    int? UsuarioId,
    string? UsuarioNombre,
    DateTime FechaHora);

// Respuesta del registro: el movimiento, el producto con la existencia ya ajustada y la alerta de reorden
// que se creó o se atendió con este movimiento (null si no cambió ninguna).
public record MovimientoRegistradoDto(MovimientoDto Movimiento, ProductoDto Producto, AlertaDto? Alerta);

public static class MovimientoMapeo
{
    // El movimiento debe venir con Producto y Usuario cargados (si no, el nombre queda vacío o null).
    public static MovimientoDto Desde(Movimiento m) => new(
        m.Id,
        m.ProductoId,
        m.Producto?.Nombre ?? string.Empty,
        m.TipoMovimiento,
        m.Cantidad,
        m.Origen,
        m.UsuarioId,
        m.Usuario?.Nombre,
        DateTime.SpecifyKind(m.FechaHora, DateTimeKind.Utc));
}
