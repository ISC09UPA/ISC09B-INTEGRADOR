namespace AlmacenInteligente.Application.DTOs;

// Formatos acordados en plan-azure-almacen.md (sección API REST).
public record UbicacionDto(string AnaquelId, string EspacioId);

public record UltimoMovimientoDto(string TipoMovimiento, int Cantidad, DateTime Timestamp);

public record ProductoDto(
    string Id,
    string Nombre,
    string? Descripcion,
    int PesoUnitarioGramos,
    int Existencia,
    int? Capacidad,       // suma de la capacidad de sus espacios; null si no tiene espacio o alguno no tiene límite
    int PuntoReorden,
    bool RequiereReorden,
    int Salidas30Dias,    // piezas que salieron en los últimos 30 días (todas las fuentes)
    string? EtiquetaVision,
    string? ImagenUrl,
    UbicacionDto? Ubicacion,
    UltimoMovimientoDto? UltimoMovimiento);

// Id opcional: si no se manda, se genera el siguiente PROD-###.
public record CrearProductoDto(
    string? Id,
    string Nombre,
    string? Descripcion,
    int PesoUnitarioGramos,
    int PuntoReorden,
    string? EtiquetaVision,
    string? ImagenUrl);

public record ActualizarReordenDto(int PuntoReorden);
