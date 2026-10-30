using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Domain.DAOs;

/// <summary>
/// Acceso a la tabla de cajones. Los 4 cajones se crean con el script inicial,
/// por eso aquí no hay "Agregar".
/// </summary>
public interface ICajonDao
{
    /// <summary>Ordenados por número, para el mapa.</summary>
    Task<IReadOnlyList<Cajon>> ObtenerTodosAsync();

    Task<Cajon?> ObtenerPorNumeroAsync(int numero);

    /// <summary>Cajones que los sensores reportan libres. Se usa para decidir si la pluma abre.</summary>
    Task<int> ContarLibresAsync();
}
