using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

public class Visita : EntidadBase
{
    /// <summary>Identificador generado por el ESP32; evita duplicados (RF-09).</summary>
    public string EventId { get; set; } = string.Empty;
    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    public int? MascotaId { get; set; }
    public Mascota? Mascota { get; set; }

    public ClaseDetectada Clase { get; set; }
    public double Confianza { get; set; }
    /// <summary>Hora real del ESP32, no la de llegada (RF-26).</summary>
    public DateTimeOffset IniciadaEn { get; set; }
    public DateTimeOffset TerminadaEn { get; set; }
    public double PlatoAntesG { get; set; }
    public double DispensadoG { get; set; }
    public double PlatoDespuesG { get; set; }
    /// <summary>RF-08: máx(0, plato antes + dispensado − plato después).</summary>
    public double ConsumidoG { get; set; }

    public static double CalcularConsumo(double antes, double dispensado, double despues)
        => Math.Round(Math.Max(0, antes + dispensado - despues), 1);
}
