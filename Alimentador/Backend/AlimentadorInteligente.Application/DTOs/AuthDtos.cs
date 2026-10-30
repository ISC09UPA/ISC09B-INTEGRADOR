namespace AlimentadorInteligente.Application.DTOs;

public record RegistroRequest(string Nombre, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(int UsuarioId, string Nombre, string AccessToken, DateTimeOffset ExpiraEn, string RefreshToken);
public record PushTokenRequest(string ExpoPushToken);
