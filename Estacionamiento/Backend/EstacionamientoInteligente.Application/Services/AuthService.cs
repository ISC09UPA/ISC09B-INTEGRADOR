using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>Login, registro y "mi perfil" (CU-01 a CU-03).</summary>
public class AuthService(
    IUsuarioDao usuarios,
    IUnidadDeTrabajo unidadDeTrabajo,
    IHasherContrasenas hasher,
    IGeneradorToken generadorToken,
    TimeProvider reloj) : IAuthService
{
    /// <summary>
    /// Mismo mensaje para correo inexistente, contraseña mala o rol equivocado,
    /// para no darle pistas a quien intenta adivinar cuentas.
    /// </summary>
    private const string MensajeCredencialesInvalidas = "Correo, contraseña o rol incorrectos.";

    public async Task<TokenResponse> IniciarSesionAsync(LoginRequest request)
    {
        var correo = Usuario.NormalizarCorreo(request.Correo);
        var usuario = await usuarios.ObtenerPorCorreoAsync(correo);

        if (usuario is null
            || !hasher.Verificar(request.Contrasena, usuario.ContrasenaHash)
            || usuario.Rol != request.Rol)
        {
            throw new ExcepcionNoAutenticado(MensajeCredencialesInvalidas);
        }

        // Se vuelve a leer con sus vehículos para devolver las placas en la respuesta.
        var completo = await usuarios.ObtenerPorIdAsync(usuario.Id) ?? usuario;
        return CrearRespuesta(completo);
    }

    public async Task<TokenResponse> RegistrarAsync(RegistroRequest request)
    {
        var correo = Usuario.NormalizarCorreo(request.Correo);

        if (await usuarios.ExisteCorreoAsync(correo))
            throw new ExcepcionConflicto("Ya existe una cuenta con ese correo.");

        var usuario = Usuario.Crear(
            request.Nombre,
            correo,
            hasher.Hashear(request.Contrasena),
            RolUsuario.Usuario,          // El registro público nunca crea administradores.
            reloj.GetUtcNow().UtcDateTime);

        usuarios.Agregar(usuario);
        await unidadDeTrabajo.GuardarCambiosAsync();

        return CrearRespuesta(usuario);
    }

    public async Task<UsuarioDto> ObtenerPerfilAsync(Guid usuarioId)
    {
        var usuario = await usuarios.ObtenerPorIdAsync(usuarioId)
            ?? throw new ExcepcionNoEncontrado("El usuario no existe.");

        return AUsuarioDto(usuario);
    }

    private TokenResponse CrearRespuesta(Usuario usuario)
    {
        var token = generadorToken.Generar(usuario);
        return new TokenResponse(token.Token, token.Expira, AUsuarioDto(usuario));
    }

    /// <summary>Solo las placas legibles de vehículos dados de alta.</summary>
    private static UsuarioDto AUsuarioDto(Usuario usuario) =>
        new(
            usuario.Id,
            usuario.Nombre,
            usuario.Correo,
            usuario.Rol,
            usuario.Vehiculos
                .Where(v => v.Estado == EstadoVehiculo.Alta && v.Placa is not null)
                .Select(v => v.Placa!.Valor)
                .ToList());
}
