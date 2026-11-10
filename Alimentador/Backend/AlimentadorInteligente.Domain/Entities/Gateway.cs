using AlimentadorInteligente.Domain.Common;

namespace AlimentadorInteligente.Domain.Entities;

/// <summary>Raspberry Pi que hace de puente entre los alimentadores y Azure.</summary>
public class Gateway : EntidadBase
{
    /// <summary>Valor que la Pi manda en X-Device-Id.</summary>
    public string DeviceId { get; set; } = string.Empty;
    /// <summary>Hash de la clave que la Pi manda en X-Device-Key (RNF-07).</summary>
    public string DeviceKeyHash { get; set; } = string.Empty;
    public DateTimeOffset? UltimoHeartbeat { get; set; }
    /// <summary>Inicio del periodo sin conexión reportado por la Pi; null si está conectada.</summary>
    public DateTimeOffset? SinConexionDesde { get; set; }
    public bool AlertaSinConexionEnviada { get; set; }
    /// <summary>Inicio del vaciado de la cola de la Pi; null si no hay datos atrasados en camino (RF-26).</summary>
    public DateTimeOffset? SincronizandoDesde { get; set; }
    public int VisitasSincronizadas { get; set; }

    /// <summary>Usuario que dio de alta la Pi; solo él puede ligarle alimentadores.</summary>
    public int? PropietarioId { get; set; }
    public Usuario? Propietario { get; set; }

    public ICollection<Alimentador> Alimentadores { get; set; } = [];

    /// <summary>Cierra la sincronización. Indica si hay que avisar y cuántas visitas llegaron.</summary>
    public (bool avisar, int visitas) TerminarSincronizacion()
    {
        var resultado = (AlertaSinConexionEnviada, VisitasSincronizadas);
        SincronizandoDesde = null;
        VisitasSincronizadas = 0;
        AlertaSinConexionEnviada = false;
        return resultado;
    }
}
