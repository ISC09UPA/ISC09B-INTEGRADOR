using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.Models;

public class Usuario : EntidadBase
{
    public string Nombre { get; private set; } = null!;
    public string Correo { get; private set; } = null!;
    public string ContrasenaHash { get; private set; } = null!;
    public RolUsuario Rol { get; private set; }
    public DateTime FechaRegistro { get; private set; }

    private readonly List<Vehiculo> _vehiculos = [];
    public IReadOnlyCollection<Vehiculo> Vehiculos => _vehiculos;

    private Usuario() { } // EF Core

    /// <param name="contrasenaHash">Ya hasheada; el dominio nunca ve la contraseña en texto plano.</param>
    public static Usuario Crear(string nombre, string correo, string contrasenaHash, RolUsuario rol, DateTime fecha)
    {
        if (string.IsNullOrWhiteSpace(nombre))
            throw new ExcepcionDominio("El nombre es obligatorio.");
        if (string.IsNullOrWhiteSpace(correo) || !correo.Contains('@'))
            throw new ExcepcionDominio("El correo no es válido.");
        if (string.IsNullOrWhiteSpace(contrasenaHash))
            throw new ExcepcionDominio("La contraseña es obligatoria.");

        return new Usuario
        {
            Nombre = nombre.Trim(),
            Correo = NormalizarCorreo(correo),
            ContrasenaHash = contrasenaHash,
            Rol = rol,
            FechaRegistro = fecha
        };
    }

    public bool EsAdministrador => Rol == RolUsuario.Administrador;

    public void CambiarContrasena(string nuevoHash)
    {
        if (string.IsNullOrWhiteSpace(nuevoHash))
            throw new ExcepcionDominio("La contraseña es obligatoria.");
        ContrasenaHash = nuevoHash;
    }

    public static string NormalizarCorreo(string correo) => correo.Trim().ToLowerInvariant();
}
