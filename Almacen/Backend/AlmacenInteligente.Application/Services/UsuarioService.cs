using System.Text;
using System.Text.RegularExpressions;
using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Alta, consulta y baja de usuarios (pantalla Usuarios, solo admin).
// La baja es lógica (activo = 0): los movimientos que registró ese usuario siguen ligados a él
// y el login ya rechaza a los usuarios inactivos.
public class UsuarioService(IUsuarioRepository usuarios, IServicioContrasena contrasenas) : IUsuarioService
{
    private const int LargoMaximoNombre = 100;            // columna nombre
    private const int LargoMinimoContrasena = 8;
    private const int BytesMaximoContrasena = 72;          // BCrypt ignora lo que pase de 72 bytes
    private static readonly Regex FormatoUsuario = new("^[A-Za-z0-9._-]{3,50}$");

    public async Task<List<UsuarioDto>> ListarAsync(CancellationToken ct = default)
    {
        var lista = await usuarios.ListarActivosAsync(ct);
        return lista.Select(Mapear).ToList();
    }

    public async Task<Resultado<UsuarioDto>> CrearAsync(CrearUsuarioDto dto, CancellationToken ct = default)
    {
        var nombre = dto.Nombre?.Trim() ?? string.Empty;
        var nombreUsuario = dto.Usuario?.Trim() ?? string.Empty;
        var contrasena = dto.Contrasena ?? string.Empty;
        var rol = dto.Rol?.Trim().ToLowerInvariant() ?? string.Empty;

        if (nombre.Length == 0)
            return Falla(TipoError.Validacion, "El nombre es obligatorio.");
        if (nombre.Length > LargoMaximoNombre)
            return Falla(TipoError.Validacion, $"El nombre puede tener máximo {LargoMaximoNombre} caracteres.");
        if (!FormatoUsuario.IsMatch(nombreUsuario))
            return Falla(TipoError.Validacion,
                "El usuario debe tener de 3 a 50 caracteres: letras sin acento, números, punto, guion o guion bajo.");
        if (contrasena.Length < LargoMinimoContrasena)
            return Falla(TipoError.Validacion, $"La contraseña debe tener al menos {LargoMinimoContrasena} caracteres.");
        if (Encoding.UTF8.GetByteCount(contrasena) > BytesMaximoContrasena)
            return Falla(TipoError.Validacion, "La contraseña es demasiado larga (máximo 72 caracteres sin acentos).");
        if (rol is not (Roles.Admin or Roles.Operador))
            return Falla(TipoError.Validacion, "El rol debe ser admin u operador.");

        if (await usuarios.ExisteNombreUsuarioAsync(nombreUsuario, ct))
            return Falla(TipoError.Conflicto, "Ese usuario ya existe.");

        var usuario = new Usuario
        {
            NombreUsuario = nombreUsuario,
            HashContrasena = contrasenas.Hashear(contrasena),
            Nombre = nombre,
            Rol = rol,
            Activo = true
        };
        usuarios.Agregar(usuario);
        await usuarios.GuardarCambiosAsync(ct);

        return Resultado<UsuarioDto>.Exito(Mapear(usuario));
    }

    public async Task<Resultado<bool>> DarDeBajaAsync(int id, int usuarioActualId, CancellationToken ct = default)
    {
        var usuario = await usuarios.ObtenerPorIdAsync(id, ct);
        if (usuario is null || !usuario.Activo)
            return Resultado<bool>.Falla(TipoError.NoEncontrado, $"No existe el usuario {id}.");
        if (usuario.Id == usuarioActualId)
            return Resultado<bool>.Falla(TipoError.Conflicto, "No puedes darte de baja a ti mismo.");
        if (usuario.Rol == Roles.Admin && await usuarios.ContarActivosPorRolAsync(Roles.Admin, ct) <= 1)
            return Resultado<bool>.Falla(TipoError.Conflicto, "No se puede dar de baja al último administrador.");

        usuario.Activo = false;
        await usuarios.GuardarCambiosAsync(ct);
        return Resultado<bool>.Exito(true);
    }

    private static Resultado<UsuarioDto> Falla(TipoError tipo, string mensaje) =>
        Resultado<UsuarioDto>.Falla(tipo, mensaje);

    private static UsuarioDto Mapear(Usuario u) => new(u.Id, u.NombreUsuario, u.Nombre, u.Rol);
}
