namespace AlmacenInteligente.Application.DTOs;

// Lectura que manda la Raspberry (o el simulador) a POST /api/lecturas de la Function App.
// IR:   { lecturaId, dispositivoId, espacioId, tipoSensor: "IR", evento: "ENTRADA" | "SALIDA", cantidad, fechaHora }
// PESO: { lecturaId, dispositivoId, espacioId, tipoSensor: "PESO", pesoGramos, fechaHora }
// lecturaId y fechaHora son opcionales (si faltan se generan), pero la Raspberry debe mandarlos
// para que las lecturas guardadas sin conexión no se dupliquen y conserven su hora real.
public record LecturaDispositivoDto(
    string? LecturaId,
    string? DispositivoId,
    string? EspacioId,
    string? TipoSensor,
    string? Evento,
    int? Cantidad,
    decimal? PesoGramos,
    DateTime? FechaHora);

// Qué pasó con una lectura al procesarla.
public record LecturaProcesadaDto(
    string LecturaId,
    string Resultado,
    string? ProductoId,
    int? ExistenciaProducto,
    AlertaReordenDto? AlertaNueva);

// Mensaje de la cola "alertas-reorden": un producto llegó a su punto de reorden.
public record AlertaReordenDto(
    long Id,
    string ProductoId,
    string ProductoNombre,
    int Existencia,
    int PuntoReorden,
    DateTime CreadaEn);
