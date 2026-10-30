using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Domain.DAOs;

/// <summary>Acceso a la tabla de usuarios (login, registro y "mi perfil").</summary>
public interface IUsuarioDao
{
    Task<Usuario?> ObtenerPorIdAsync(Guid id);

    /// <summary>Busca por correo ya normalizado con <see cref="Usuario.NormalizarCorreo"/>.</summary>
    Task<Usuario?> ObtenerPorCorreoAsync(string correo);

    /// <summary>Para no registrar dos cuentas con el mismo correo.</summary>
    Task<bool> ExisteCorreoAsync(string correo);

    void Agregar(Usuario usuario);
}
