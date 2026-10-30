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
    int Id, int AlimentadorId, TipoComando Tipo, EstadoComando Estado, int? MascotaId,
    double? Gramos, double? DispensadoG, string? Error, DateTimeOffset CreadoEn);

public record DispensarRequest(double Gramos, int? MascotaId);
