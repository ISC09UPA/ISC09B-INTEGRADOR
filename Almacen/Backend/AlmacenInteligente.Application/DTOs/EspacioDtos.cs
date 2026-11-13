namespace AlmacenInteligente.Application.DTOs;

public record EspacioDto(
    string Id,
    string AnaquelId,
    string? ProductoId,
    string? ProductoNombre,
    int Existencia,
    int? Capacidad,
    int TaraGramos,
    DateTime? UltimaLectura);

// Cuerpo de PUT /api/espacios/{id}:
//   productoId: producto asignado (null = espacio vacío)
//   capacidad:  piezas máximas (null = sin límite)
//   taraGramos: peso del contenedor vacío (null = no se cambia)
public record ActualizarEspacioDto(string? ProductoId, int? Capacidad, int? TaraGramos);
