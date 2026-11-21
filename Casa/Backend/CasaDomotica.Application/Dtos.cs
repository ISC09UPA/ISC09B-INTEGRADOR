namespace CasaDomotica.Application;

public record LoginDto(string? Usuario, string? Password);
public record RostroDto(string? Imagen);
public record LuzDto(bool Encendida);
public record SeguridadDto(bool Activa);
public record PersonaDto(string? Nombre);

/// <summary>Evento de la Raspberry: alguien intentó entrar. La foto va en base64 (opcional).</summary>
public record AccesoEventoDto(string? Zona, bool Autorizado, string? Nombre, double? Probabilidad, string? Foto);
public record MovimientoDto(string? Zona);
public record LuxDto(int Lux);
public record ClimaDto(string Zona, double Temp, double Hum);

public record Registro(string Mensaje, DateTime Hora);
public record ClimaZona(double Temp, double Hum);
