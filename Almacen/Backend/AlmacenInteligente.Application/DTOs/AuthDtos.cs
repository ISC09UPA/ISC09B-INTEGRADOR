namespace AlmacenInteligente.Application.DTOs;

// Cuerpo de POST /api/auth/login
public record LoginDto(string? Usuario, string? Contrasena);

// Datos del usuario que se devuelven al app (nunca el hash).
public record UsuarioSesionDto(int Id, string Usuario, string Nombre, string Rol);

// Respuesta de POST /api/auth/login: el token se manda en cada petición como "Authorization: Bearer <token>".
public record LoginRespuestaDto(string Token, DateTime ExpiraEnUtc, UsuarioSesionDto Usuario);
