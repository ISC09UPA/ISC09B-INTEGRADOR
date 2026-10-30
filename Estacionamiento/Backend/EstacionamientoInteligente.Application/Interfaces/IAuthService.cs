using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Login, registro y "mi perfil" (CU-01 a CU-03).</summary>
public interface IAuthService
{
    /// <summary>
    /// Verifica correo, contraseña y que el rol elegido sea el de la cuenta.
    /// Si algo no coincide lanza <c>ExcepcionDominio</c> con el mismo mensaje en todos los casos.
    /// </summary>
    Task<TokenResponse> IniciarSesionAsync(LoginRequest request);

    /// <summary>Crea una cuenta con rol Usuario y la deja con sesión iniciada. Si el correo ya existe lanza <c>ExcepcionConflicto</c>.</summary>
    Task<TokenResponse> RegistrarAsync(RegistroRequest request);

    /// <param name="usuarioId">El id que viene en el token del usuario que consulta.</param>
    Task<UsuarioDto> ObtenerPerfilAsync(Guid usuarioId);
}
