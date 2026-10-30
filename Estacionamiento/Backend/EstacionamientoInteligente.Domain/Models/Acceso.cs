using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.Models;

/// <summary>
/// Una estancia: va de la entrada a la salida de un vehículo.
/// Mientras <see cref="HoraSalida"/> sea null, el acceso está abierto y
/// el siguiente paso de esa placa por la pluma se toma como salida.
/// </summary>
public class Acceso : EntidadBase
{
    public Guid VehiculoId { get; private set; }
    public Vehiculo Vehiculo { get; private set; } = null!;

    /// <summary>Último cajón donde se estacionó. Se conserva aunque el auto lo deje, para el historial.</summary>
    public Guid? CajonId { get; private set; }
    public Cajon? Cajon { get; private set; }

    /// <summary>True mientras el auto está dentro de <see cref="CajonId"/>.</summary>
    public bool Estacionado { get; private set; }

    /// <summary>
    /// Desde cuándo el auto está dentro pero sin cajón (recién entró o cambió de lugar).
    /// Null mientras está estacionado o cuando ya salió.
    /// </summary>
    public DateTime? SinCajonDesde { get; private set; }

    public DateTime HoraEntrada { get; private set; }
    public DateTime? HoraSalida { get; private set; }
    public string FotoEntrada { get; private set; } = null!;
    public string? FotoSalida { get; private set; }

    /// <summary>Confianza de Computer Vision al leer la placa en la entrada (0 a 1).</summary>
    public double ConfianzaOcr { get; private set; }
    public OrigenAcceso Origen { get; private set; }

    private Acceso() { } // EF Core

    public static Acceso RegistrarEntrada(Guid vehiculoId, DateTime hora, string foto, double confianzaOcr, OrigenAcceso origen)
    {
        if (string.IsNullOrWhiteSpace(foto))
            throw new ExcepcionDominio("La entrada necesita la foto del vehículo.");

        return new Acceso
        {
            VehiculoId = vehiculoId,
            HoraEntrada = hora,
            SinCajonDesde = hora,
            FotoEntrada = foto,
            ConfianzaOcr = Math.Clamp(confianzaOcr, 0, 1),
            Origen = origen
        };
    }

    public bool EstaAbierto => HoraSalida is null;

    /// <summary>Está dentro del estacionamiento pero todavía no ocupa ningún cajón.</summary>
    public bool EnTransito => EstaAbierto && !Estacionado;

    public void RegistrarSalida(DateTime hora, string foto)
    {
        if (!EstaAbierto)
            throw new ExcepcionDominio("Este acceso ya tiene registrada su salida.");
        if (hora < HoraEntrada)
            throw new ExcepcionDominio("La hora de salida no puede ser anterior a la de entrada.");

        HoraSalida = hora;
        FotoSalida = foto;
        Estacionado = false;
        SinCajonDesde = null;
    }

    /// <summary>El sensor de un cajón detectó este auto.</summary>
    public void EstacionarEn(Guid cajonId)
    {
        if (!EstaAbierto)
            throw new ExcepcionDominio("No se puede asignar un cajón a un acceso cerrado.");

        CajonId = cajonId;
        Estacionado = true;
        SinCajonDesde = null;
    }

    /// <summary>
    /// El auto dejó su cajón. No es una salida: puede estar cambiando de lugar.
    /// La salida solo la registra la cámara de la pluma.
    /// </summary>
    public void DejarCajon(DateTime fecha)
    {
        if (!Estacionado)
            return;
        Estacionado = false;
        SinCajonDesde = fecha;
    }

    /// <summary>Tiempo de estancia; si sigue dentro, se calcula hasta <paramref name="ahora"/>.</summary>
    public TimeSpan Duracion(DateTime ahora) => (HoraSalida ?? ahora) - HoraEntrada;
}
