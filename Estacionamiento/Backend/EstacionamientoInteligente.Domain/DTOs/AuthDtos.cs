using System.ComponentModel.DataAnnotations;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.DTOs;

/// <param name="Rol">El rol que eligió en el selector del login. Debe coincidir con el de su cuenta.</param>
public sealed record LoginRequest(
    [Required, EmailAddress] string Correo,
    [Required] string Contrasena,
    RolUsuario Rol);

public sealed record RegistroRequest(
    [Required, StringLength(100)] string Nombre,
    [Required, EmailAddress] string Correo,
    [Required, MinLength(8)] string Contrasena);

public sealed record TokenResponse(string Token, DateTime Expira, UsuarioDto Usuario);

public sealed record UsuarioDto(
    Guid Id,
    string Nombre,
    string Correo,
    RolUsuario Rol,
    IReadOnlyList<string> Placas);
