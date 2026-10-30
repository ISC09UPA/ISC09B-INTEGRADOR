using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.Models;

/// <summary>
/// Aviso para el administrador: entrada negada por estacionamiento lleno,
/// placa que no se pudo leer o auto que lleva demasiado tiempo sin cajón.
/// </summary>
public class Alerta : EntidadBase
{
    public TipoAlerta Tipo { get; private set; }
    public string Mensaje { get; private set; } = null!;
    public string? Placa { get; private set; }
    public string? Foto { get; private set; }

    /// <summary>Vehículo relacionado, para que el administrador pueda corregirlo desde la alerta.</summary>
    public Guid? VehiculoId { get; private set; }

    public DateTime Fecha { get; private set; }
    public bool Atendida { get; private set; }
    public DateTime? FechaAtencion { get; private set; }
    public Guid? AtendidaPorId { get; private set; }

    private Alerta() { } // EF Core

    public static Alerta EntradaNegada(string? placa, string foto, DateTime fecha) =>
        new()
        {
            Tipo = TipoAlerta.EntradaNegada,
            Mensaje = "Entrada negada: estacionamiento lleno.",
            Placa = placa,
            Foto = foto,
            Fecha = fecha
        };

    public static Alerta PlacaNoLegible(Guid vehiculoId, string foto, DateTime fecha) =>
        new()
        {
            Tipo = TipoAlerta.PlacaNoLegible,
            Mensaje = "Entró un vehículo con placa no legible. Corrige la placa.",
            VehiculoId = vehiculoId,
            Foto = foto,
            Fecha = fecha
        };

    public static Alerta CajonSinSalida(Guid vehiculoId, string? placa, TimeSpan tiempoSinCajon, DateTime fecha) =>
        new()
        {
            Tipo = TipoAlerta.CajonSinSalida,
            Mensaje = $"El vehículo lleva {(int)tiempoSinCajon.TotalMinutes} min dentro sin ocupar un cajón ni salir.",
            VehiculoId = vehiculoId,
            Placa = placa,
            Fecha = fecha
        };

    public void Atender(Guid administradorId, DateTime fecha)
    {
        if (Atendida)
            throw new ExcepcionDominio("La alerta ya fue atendida.");
        Atendida = true;
        AtendidaPorId = administradorId;
        FechaAtencion = fecha;
    }
}
