using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

public class Comando : EntidadBase
{
    /// <summary>Tiempo tras el cual un dispensado manual ya no se ejecuta (sección 8.3).</summary>
    public static readonly TimeSpan VigenciaDispensado = TimeSpan.FromMinutes(2);

    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    public int? SolicitadoPorId { get; set; }
    public Usuario? SolicitadoPor { get; set; }

    public TipoComando Tipo { get; set; }
    public EstadoComando Estado { get; set; } = EstadoComando.Pendiente;

    // Dispensar
    public int? MascotaId { get; set; }
    public double? Gramos { get; set; }

    // OTA
    public int? ArtefactoOtaId { get; set; }
    public ArtefactoOta? ArtefactoOta { get; set; }

    public DateTimeOffset? EntregadoEn { get; set; }
    public DateTimeOffset? CompletadoEn { get; set; }
    public double? DispensadoG { get; set; }
    public string? Error { get; set; }

    public bool EstaVencido(DateTimeOffset ahora)
        => Tipo == TipoComando.Dispensar && ahora - CreadoEn > VigenciaDispensado;
}
