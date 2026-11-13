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
    string Origen,         // SENSOR | CAMARA | MANUAL
    int? UsuarioId,
    string? UsuarioNombre,
    DateTime FechaHora);

// Respuesta del registro: el movimiento y el producto con la existencia ya ajustada.
public record MovimientoRegistradoDto(MovimientoDto Movimiento, ProductoDto Producto);
