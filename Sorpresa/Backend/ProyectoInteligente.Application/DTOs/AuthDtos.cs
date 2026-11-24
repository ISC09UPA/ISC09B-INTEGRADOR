using System.ComponentModel.DataAnnotations;

namespace ProyectoInteligente.Application.DTOs;

public record LoginRequest([Required, EmailAddress] string Correo, [Required] string Password);
public record LoginResponse(string Token, string Nombre, string Rol);
public record RegisterRequest([Required, MinLength(2)] string Nombre, [Required, EmailAddress] string Correo, [Required, MinLength(6)] string Password);
