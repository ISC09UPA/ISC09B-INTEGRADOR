using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.DTOs;

// Cuerpo de POST /api/pedidos. El usuario sale del token.
public record CrearPedidoDto(string? ProductoId, int Cantidad);

// Cuerpo opcional de PUT /api/pedidos/{id}/recibir. Si no se manda la cantidad, se toma la pedida.
public record RecibirPedidoDto(int? CantidadRecibida);

public record ProveedorResumenDto(int Id, string Nombre, string Email);

public record PedidoDto(
    long Id,
    string ProductoId,
    string ProductoNombre,
    int Cantidad,
    int? CantidadRecibida,
    string Estado,              // SOLICITADO | RECIBIDO | CANCELADO
    ProveedorResumenDto Proveedor,
    bool CorreoEnviado,
    long? AlertaId,
    string UsuarioNombre,
    DateTime FechaSolicitud,
    DateTime? FechaRecepcion);

// Respuesta de recibir: el pedido, la ENTRADA que se registró (origen PEDIDO), el producto con la
// existencia nueva y la alerta que se atendió con esa entrada (null si no cambió ninguna).
public record PedidoRecibidoDto(PedidoDto Pedido, MovimientoDto Movimiento, ProductoDto Producto, AlertaDto? Alerta);

public static class PedidoMapeo
{
    // El pedido debe venir con Producto, Proveedor y Usuario cargados.
    public static PedidoDto Desde(Pedido p) => new(
        p.Id,
        p.ProductoId,
        p.Producto?.Nombre ?? string.Empty,
        p.Cantidad,
        p.CantidadRecibida,
        p.Estado,
        new ProveedorResumenDto(p.ProveedorId, p.Proveedor?.Nombre ?? string.Empty, p.Proveedor?.Email ?? string.Empty),
        p.CorreoEnviado,
        p.AlertaId,
        p.Usuario?.Nombre ?? string.Empty,
        DateTime.SpecifyKind(p.FechaSolicitud, DateTimeKind.Utc),
        p.FechaRecepcion is DateTime recibido ? DateTime.SpecifyKind(recibido, DateTimeKind.Utc) : null);
}
