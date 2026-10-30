using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.Models;

/// <summary>
/// Bitácora de lo que reporta la maqueta. Sirve para auditoría y para saber
/// el estado actual de la pluma (el último evento de tipo Pluma).
/// </summary>
public class EventoSensor : EntidadBase
{
    public const string DispositivoPluma = "pluma";

    public string Dispositivo { get; private set; } = null!;
    public TipoEventoSensor Tipo { get; private set; }
    public string Valor { get; private set; } = null!;

    /// <summary>Información extra, por ejemplo qué administrador abrió la pluma a mano.</summary>
    public string? Detalle { get; private set; }

    public DateTime Fecha { get; private set; }

    private EventoSensor() { } // EF Core

    public static EventoSensor CambioCajon(int numeroCajon, bool ocupado, DateTime fecha) =>
        new()
        {
            Dispositivo = $"cajon-{numeroCajon}",
            Tipo = TipoEventoSensor.Cajon,
            Valor = ocupado ? "ocupado" : "libre",
            Fecha = fecha
        };

    public static EventoSensor CambioPluma(bool abierta, DateTime fecha, string? detalle = null) =>
        new()
        {
            Dispositivo = DispositivoPluma,
            Tipo = TipoEventoSensor.Pluma,
            Valor = abierta ? "abierta" : "cerrada",
            Detalle = detalle,
            Fecha = fecha
        };

    public bool PlumaAbierta => Tipo == TipoEventoSensor.Pluma && Valor == "abierta";
}
