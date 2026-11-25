using System.ComponentModel.DataAnnotations;

namespace ProyectoInteligente.Application.DTOs;

public record LoginRequest([Required, EmailAddress] string Correo, [Required] string Password);
public record LoginResponse(string Token, string Nombre, string Rol);

public record RegisterRequest(
    [Required, MaxLength(100)] string Nombre,
    [Required, EmailAddress, MaxLength(200)] string Correo,
    [Required, MinLength(8), MaxLength(72)] string Password);
