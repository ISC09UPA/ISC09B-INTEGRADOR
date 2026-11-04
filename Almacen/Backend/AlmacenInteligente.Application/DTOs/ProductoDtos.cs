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
    int PuntoReorden,
    bool RequiereReorden,
    string? EtiquetaVision,
    string? ImagenUrl,
    UbicacionDto? Ubicacion,
    UltimoMovimientoDto? UltimoMovimiento);

public record CrearProductoDto(
    string Id,
    string Nombre,
    string? Descripcion,
    int PesoUnitarioGramos,
    int PuntoReorden,
    string? EtiquetaVision,
    string? ImagenUrl);

public record ActualizarReordenDto(int PuntoReorden);
