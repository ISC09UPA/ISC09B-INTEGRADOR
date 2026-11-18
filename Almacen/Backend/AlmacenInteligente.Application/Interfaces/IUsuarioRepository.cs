using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface IUsuarioRepository
{
    Task<Usuario?> ObtenerPorNombreUsuarioAsync(string nombreUsuario, CancellationToken ct = default);

    Task<List<Usuario>> ListarActivosAsync(CancellationToken ct = default);

    // Con seguimiento de cambios (para darlo de baja).
    Task<Usuario?> ObtenerPorIdAsync(int id, CancellationToken ct = default);

    // Incluye usuarios dados de baja: el nombre de usuario nunca se repite.
    Task<bool> ExisteNombreUsuarioAsync(string nombreUsuario, CancellationToken ct = default);

    Task<int> ContarActivosPorRolAsync(string rol, CancellationToken ct = default);

    void Agregar(Usuario usuario);
    Task GuardarCambiosAsync(CancellationToken ct = default);
}
