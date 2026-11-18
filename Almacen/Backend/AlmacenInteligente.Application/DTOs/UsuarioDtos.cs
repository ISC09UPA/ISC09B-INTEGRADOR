namespace AlmacenInteligente.Application.DTOs;

// Cuerpo de POST /api/usuarios (admin). Rol: "admin" u "operador".
public record CrearUsuarioDto(string? Nombre, string? Usuario, string? Contrasena, string? Rol);

// Usuario en las respuestas de /api/usuarios. Nunca incluye la contraseña ni su hash.
public record UsuarioDto(int Id, string Usuario, string Nombre, string Rol);
