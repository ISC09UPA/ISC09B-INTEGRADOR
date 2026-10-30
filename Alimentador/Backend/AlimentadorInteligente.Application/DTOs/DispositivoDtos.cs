namespace AlimentadorInteligente.Application.DTOs;

// Contrato Raspberry Pi ↔ backend (sección 8.2). Las horas vienen en Unix (segundos) desde el ESP32.

public record ConfiguracionDispositivoDto(IReadOnlyList<ConfigAlimentadorDto> Feeders);

public record ConfigAlimentadorDto(
    string FeederId, int Version, int MinIntervalHours,
    IReadOnlyList<ConfigMascotaDto> Pets, IReadOnlyList<ConfigHorarioDto> Schedules);

public record ConfigMascotaDto(int Id, string Name, string Species, string? Rfid, double GramsPerMeal);
public record ConfigHorarioDto(int? PetId, string Time);

public record HeartbeatRequest(long? OfflineSince, IReadOnlyList<EstadoFeederDto> Feeders);
public record EstadoFeederDto(
    string FeederId, bool Online, double? HopperPct, double? PlateG,
    string? Firmware, string? Model, long ReportedAt);
public record HeartbeatResponse(long ServerTime);

public record VisitaDispositivoDto(
    string FeederId, string EventId, int? PetId, string Class, double Confidence,
    long StartedAt, long EndedAt, double PlateBeforeG, double DispensedG, double PlateAfterG);

public record EventoDispositivoDto(string FeederId, string EventId, string Type, long OccurredAt, string? Detail);

public record LoteResponse(int Recibidos, int Duplicados);

public record ComandoDispositivoDto(int Id, string FeederId, string Type, double? Grams, int? PetId, string? Url, string? Sha256);
public record ResultadoComandoRequest(bool Ok, double? DispensedG, string? Error);

public record SolicitudFotoRequest(string FeederId, string EventId, string Class, double Confidence, long TakenAt);
public record SolicitudFotoResponse(string UploadUrl, string BlobName);
