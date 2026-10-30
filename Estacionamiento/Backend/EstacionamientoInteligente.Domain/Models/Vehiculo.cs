using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.ValueObjects;

namespace EstacionamientoInteligente.Domain.Models;

/// <summary>
/// Vehículo registrado, ya sea porque el administrador lo dio de alta
/// o porque pasó por la pluma. Si la cámara no pudo leer la placa,
/// <see cref="Placa"/> queda en null hasta que el administrador la corrija.
/// </summary>
public class Vehiculo : EntidadBase
{
    public Placa? Placa { get; private set; }
    public TipoVehiculo Tipo { get; private set; }
    public Guid? UsuarioId { get; private set; }
    public Usuario? Usuario { get; private set; }
    public EstadoVehiculo Estado { get; private set; }
    public DateTime FechaAlta { get; private set; }
    public DateTime? FechaBaja { get; private set; }

    private Vehiculo() { } // EF Core

    public static Vehiculo Registrar(Placa placa, TipoVehiculo tipo, DateTime fecha, Guid? usuarioId = null) =>
        new()
        {
            Placa = placa,
            Tipo = tipo,
            UsuarioId = usuarioId,
            Estado = EstadoVehiculo.Alta,
            FechaAlta = fecha
        };

    /// <summary>Vehículo que entró sin que la cámara pudiera leer su placa.</summary>
    public static Vehiculo RegistrarSinPlaca(TipoVehiculo tipo, DateTime fecha) =>
        new()
        {
            Placa = null,
            Tipo = tipo,
            Estado = EstadoVehiculo.Alta,
            FechaAlta = fecha
        };

    public bool PlacaLegible => Placa is not null;

    public void CorregirPlaca(Placa placa) => Placa = placa;

    /// <summary>
    /// Solo reemplaza el tipo si el nuevo es conocido, para que una mala
    /// clasificación de Custom Vision no borre un tipo que ya estaba bien.
    /// </summary>
    public void ActualizarTipo(TipoVehiculo tipo)
    {
        if (tipo != TipoVehiculo.Desconocido)
            Tipo = tipo;
    }

    public void AsignarUsuario(Guid? usuarioId) => UsuarioId = usuarioId;

    /// <summary>
    /// La baja solo cambia el registro; no impide el acceso, porque la regla
    /// del proyecto es que entra cualquier placa mientras haya lugar.
    /// </summary>
    public void DarDeBaja(DateTime fecha)
    {
        if (Estado == EstadoVehiculo.Baja)
            throw new ExcepcionDominio("El vehículo ya está dado de baja.");
        Estado = EstadoVehiculo.Baja;
        FechaBaja = fecha;
    }

    public void Reactivar()
    {
        if (Estado == EstadoVehiculo.Alta)
            throw new ExcepcionDominio("El vehículo ya está activo.");
        Estado = EstadoVehiculo.Alta;
        FechaBaja = null;
    }
}
