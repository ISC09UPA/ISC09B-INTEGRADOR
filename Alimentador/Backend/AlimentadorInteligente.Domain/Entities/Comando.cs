using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

public class Comando : EntidadBase
{
    /// <summary>Tiempo tras el cual un dispensado manual ya no se ejecuta (sección 8.3).</summary>
    public static readonly TimeSpan VigenciaDispensado = TimeSpan.FromMinutes(2);
    /// <summary>Espera máxima del resultado de una actualización ya entregada.</summary>
    public static readonly TimeSpan EsperaResultadoOta = TimeSpan.FromMinutes(30);
    /// <summary>Error con el que se cierra un comando entregado que nunca tuvo respuesta.</summary>
    public const string ErrorSinRespuesta = "El alimentador no respondió.";

    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    public int? SolicitadoPorId { get; set; }
    public Usuario? SolicitadoPor { get; set; }

    public TipoComando Tipo { get; set; }
    public EstadoComando Estado { get; set; } = EstadoComando.Pendiente;

    // Dispensar
    public int? MascotaId { get; set; }
    public int? Tolva { get; set; }
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

    /// <summary>Se entregó, pero la Pi nunca reportó el resultado.</summary>
    public bool SinResultado(DateTimeOffset ahora)
        => Estado == EstadoComando.Entregado && EntregadoEn is { } entregado
           && ahora - entregado > (Tipo == TipoComando.Dispensar ? VigenciaDispensado : EsperaResultadoOta);

    /// <summary>
    /// Se dio por fallido solo porque no llegó respuesta a tiempo. Si la Pi estuvo sin internet,
    /// el resultado real puede llegar después y debe reemplazar al supuesto.
    /// </summary>
    public bool CerradoSinRespuesta
        => Estado == EstadoComando.Fallido && Error == ErrorSinRespuesta;
}
