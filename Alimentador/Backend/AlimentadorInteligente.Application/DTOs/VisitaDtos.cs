using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Application.DTOs;

public record VisitaDto(
    int Id, string EventId, int? MascotaId, ClaseDetectada Clase, double Confianza,
    DateTimeOffset IniciadaEn, DateTimeOffset TerminadaEn,
    double PlatoAntesG, double DispensadoG, double PlatoDespuesG, double ConsumidoG);

/// <summary>Ración recomendada vs. real por día (RF-18).</summary>
public record ConsumoDiarioDto(DateOnly Dia, double RecomendadoG, double DispensadoG, double ConsumidoG, int Visitas);

public record AlertaDto(
    int Id, int AlimentadorId, int? MascotaId, TipoAlerta Tipo, string Mensaje,
    DateTimeOffset OcurridaEn, DateTimeOffset CreadaEn, bool Leida);

public record ComandoDto(
    int Id, int AlimentadorId, TipoComando Tipo, EstadoComando Estado, int? MascotaId, int? Tolva,
    double? Gramos, double? DispensadoG, string? Error, DateTimeOffset CreadoEn);

/// <summary>Con mascota, la tolva sale de su especie; sin mascota hay que indicar la tolva (1 perro, 2 gato).</summary>
public record DispensarRequest(double Gramos, int? MascotaId, int? Tolva = null);

public record ArtefactoOtaDto(int Id, TipoArtefactoOta Tipo, string Version, string Sha256, long TamanoBytes, DateTimeOffset CreadoEn);
public record LanzarOtaRequest(int ArtefactoId);
/// <summary>Datos de un artefacto a publicar; el archivo viaja aparte (multipart). Tipo: "firmware" o "modelo".</summary>
public record PublicarArtefactoRequest(string Tipo, string Version, string NombreArchivo);
