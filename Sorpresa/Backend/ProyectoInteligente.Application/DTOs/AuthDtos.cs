using System.ComponentModel.DataAnnotations;

namespace ProyectoInteligente.Application.DTOs;

public record LoginRequest([Required, EmailAddress] string Correo, [Required] string Password);
public record LoginResponse(string Token, string Nombre, string Rol);
