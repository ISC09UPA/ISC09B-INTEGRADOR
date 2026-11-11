using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;

namespace AlmacenInteligente.Application.Services;

public class AuthService(
    IUsuarioRepository usuarios,
    IServicioContrasena contrasenas,
    IGeneradorToken generadorToken) : IAuthService
{
    // Mismo mensaje para usuario inexistente, dado de baja o contraseña incorrecta:
    // así no se revela cuáles usuarios existen.
    private const string MensajeCredenciales = "Usuario o contraseña incorrectos.";

    public async Task<Resultado<LoginRespuestaDto>> LoginAsync(LoginDto dto, CancellationToken ct = default)
    {
        var nombreUsuario = dto.Usuario?.Trim() ?? string.Empty;
        var contrasena = dto.Contrasena ?? string.Empty;

        if (nombreUsuario.Length == 0 || contrasena.Length == 0)
            return Resultado<LoginRespuestaDto>.Falla(TipoError.Validacion, "Escribe tu usuario y tu contraseña.");

        // Límites de las columnas de Usuarios (usuario 50, hashContrasena 200).
        if (nombreUsuario.Length > 50 || contrasena.Length > 200)
            return Resultado<LoginRespuestaDto>.Falla(TipoError.NoAutorizado, MensajeCredenciales);

        var usuario = await usuarios.ObtenerPorNombreUsuarioAsync(nombreUsuario, ct);
        if (usuario is null || !usuario.Activo || !contrasenas.Verificar(contrasena, usuario.HashContrasena))
            return Resultado<LoginRespuestaDto>.Falla(TipoError.NoAutorizado, MensajeCredenciales);

        var token = generadorToken.Generar(usuario);
        var sesion = new UsuarioSesionDto(usuario.Id, usuario.NombreUsuario, usuario.Nombre, usuario.Rol);
        return Resultado<LoginRespuestaDto>.Exito(new LoginRespuestaDto(token.Token, token.ExpiraEnUtc, sesion));
    }
}
