using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Domain.ValueObjects;

namespace EstacionamientoInteligente.Domain.DAOs;

/// <summary>Acceso a la tabla de vehículos (pantalla 6 y lectura de placas en la pluma).</summary>
public interface IVehiculoDao
{
    /// <summary>Incluye el usuario dueño, para mostrar su correo.</summary>
    Task<Vehiculo?> ObtenerPorIdAsync(Guid id);

    /// <summary>
    /// Busca por la clave de la placa (sin guiones ni espacios), así "ABC-123-A" y "abc123a"
    /// encuentran el mismo vehículo.
    /// </summary>
    Task<Vehiculo?> ObtenerPorPlacaAsync(Placa placa);

    /// <summary>Lista de la pantalla 6, con el usuario dueño incluido.</summary>
    /// <param name="textoPlaca">Parte de la placa escrita en el buscador; null para no filtrar.</param>
    /// <param name="filtro">Chip seleccionado (todos, dentro, fuera, baja).</param>
    Task<IReadOnlyList<Vehiculo>> BuscarAsync(string? textoPlaca, FiltroVehiculos filtro);

    void Agregar(Vehiculo vehiculo);
}
