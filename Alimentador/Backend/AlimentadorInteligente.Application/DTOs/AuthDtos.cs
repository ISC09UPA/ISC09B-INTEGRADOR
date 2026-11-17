namespace AlimentadorInteligente.Application.DTOs;

public record RegistroRequest(string Nombre, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(
    int UsuarioId, string Nombre, string AccessToken, DateTimeOffset ExpiraEn, string RefreshToken, bool EsAdministrador);
public record PushTokenRequest(string ExpoPushToken);
/// <summary>Datos del usuario de la sesión; el panel web lo usa para saber si mostrar la administración.</summary>
public record YoDto(int Id, string Nombre, string Email, bool EsAdministrador);
