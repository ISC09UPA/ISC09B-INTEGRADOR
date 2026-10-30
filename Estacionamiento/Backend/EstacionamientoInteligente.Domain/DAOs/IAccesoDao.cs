using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Domain.DAOs;

/// <summary>
/// Acceso a la tabla de accesos (cada entrada y su salida). Es la tabla que más se consulta:
/// la usan la pluma, los sensores, el historial y las estadísticas.
/// Un acceso "abierto" es el que tiene entrada y todavía no tiene salida.
/// Todos los métodos que devuelven accesos incluyen su vehículo y su cajón.
/// </summary>
public interface IAccesoDao
{
    // ---- Pluma: ¿es entrada o salida? ----

    /// <summary>Acceso abierto del vehículo. Si existe, el siguiente paso por la pluma es su salida.</summary>
    Task<Acceso?> ObtenerAbiertoDeVehiculoAsync(Guid vehiculoId);

    /// <summary>Último acceso del vehículo (abierto o cerrado), para ignorar lecturas repetidas.</summary>
    Task<Acceso?> ObtenerUltimoDeVehiculoAsync(Guid vehiculoId);

    // ---- Sensores de cajón ----

    /// <summary>
    /// Autos que ya entraron pero todavía no ocupan cajón. Se restan a los cajones libres
    /// y entre ellos se elige a quién asignar un cajón que se acaba de ocupar.
    /// </summary>
    Task<IReadOnlyList<Acceso>> ObtenerEnTransitoAsync();

    /// <summary>Acceso abierto estacionado en ese cajón; se usa cuando el sensor marca que se liberó.</summary>
    Task<Acceso?> ObtenerAbiertoEnCajonAsync(Guid cajonId);

    /// <summary>Todos los accesos abiertos: autos que están dentro ahora mismo.</summary>
    Task<IReadOnlyList<Acceso>> ObtenerAbiertosAsync();

    // ---- Usuario: mapa e historial ----

    /// <summary>Acceso abierto de cualquiera de los vehículos del usuario ("tu auto está en el cajón 3").</summary>
    Task<Acceso?> ObtenerAbiertoDeUsuarioAsync(Guid usuarioId);

    /// <summary>Accesos de los vehículos del usuario, del más reciente al más antiguo.</summary>
    /// <param name="desde">Inicio del periodo (UTC); null para traer todo.</param>
    /// <param name="hasta">Fin del periodo (UTC, sin incluir); null para no limitar.</param>
    Task<IReadOnlyList<Acceso>> ObtenerDeUsuarioAsync(Guid usuarioId, DateTime? desde, DateTime? hasta);

    // ---- Estadísticas del administrador ----

    /// <summary>Accesos con entrada dentro del periodo [desde, hasta), en UTC.</summary>
    Task<IReadOnlyList<Acceso>> ObtenerEntreFechasAsync(DateTime desde, DateTime hasta);

    void Agregar(Acceso acceso);
}
