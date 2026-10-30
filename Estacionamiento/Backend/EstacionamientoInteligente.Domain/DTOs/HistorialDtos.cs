namespace EstacionamientoInteligente.Domain.DTOs;

public enum PeriodoHistorial
{
    Semana = 1,
    Mes = 2,
    Todo = 3
}

/// <summary>Tarjeta "Tu auto está en el cajón 3" del mapa.</summary>
/// <param name="Cajon">Null si el auto ya entró pero todavía no se estaciona.</param>
public sealed record AccesoActualDto(
    Guid AccesoId,
    int? Cajon,
    string? Placa,
    DateTime HoraEntrada,
    int MinutosEstancia);

/// <summary>Una fila de la pantalla 4.</summary>
public sealed record HistorialItemDto(
    Guid AccesoId,
    DateTime HoraEntrada,
    DateTime? HoraSalida,
    int? Cajon,
    string? Placa,
    int MinutosEstancia,
    bool EnCurso);

/// <summary>Tarjetas de resumen de la pantalla 4.</summary>
/// <param name="Mes">Formato "2026-10".</param>
public sealed record ResumenMesDto(
    string Mes,
    int Visitas,
    int MinutosPromedio,
    int? CajonFrecuente);
