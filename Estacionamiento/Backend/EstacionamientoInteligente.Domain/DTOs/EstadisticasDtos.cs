namespace EstacionamientoInteligente.Domain.DTOs;

/// <summary>Tarjetas superiores de la pantalla 5.</summary>
public sealed record PanelDto(
    DateOnly Fecha,
    int Ocupados,
    int Total,
    int EntradasHoy,
    int EntradasNegadasHoy,
    int MinutosPromedio,
    int? CajonMasUsado);

/// <summary>Una barra de "Ocupación por hora".</summary>
/// <param name="Hora">0 a 23.</param>
/// <param name="CajonesOcupados">Máximo de cajones ocupados durante esa hora.</param>
public sealed record OcupacionHoraDto(int Hora, int CajonesOcupados, int Entradas);

/// <summary>Una fila de "Uso por cajón".</summary>
public sealed record UsoCajonDto(int Cajon, int Usos);
