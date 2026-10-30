using AlimentadorInteligente.Domain.Common;

namespace AlimentadorInteligente.Domain.Entities;

public class Alimentador : EntidadBase
{
    public const int MaxMascotas = 3;

    /// <summary>Identificador usado en los temas MQTT feeder/{id}/...</summary>
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    /// <summary>Kcal por gramo del alimento, tomadas de la etiqueta.</summary>
    public double KcalPorGramo { get; set; } = 3.5;
    /// <summary>Intervalo mínimo entre comidas de una misma mascota (RF-07).</summary>
    public int IntervaloMinimoHoras { get; set; } = 3;
    /// <summary>Se incrementa con cada cambio de mascotas, raciones u horarios (RF-13).</summary>
    public int VersionConfiguracion { get; set; } = 1;

    // Último estado reportado por el ESP32 (feeder/{id}/status)
    public bool EnLinea { get; set; }
    public double? NivelTolvaPorcentaje { get; set; }
    public double? PesoPlatoG { get; set; }
    public string? VersionFirmware { get; set; }
    public string? VersionModelo { get; set; }
    public DateTimeOffset? UltimoEstado { get; set; }
    public bool AlertaSinConexionEnviada { get; set; }

    public int? GatewayId { get; set; }
    public Gateway? Gateway { get; set; }

    public ICollection<Mascota> Mascotas { get; set; } = [];
    public ICollection<Horario> Horarios { get; set; } = [];
    public ICollection<MiembroAlimentador> Miembros { get; set; } = [];
}
