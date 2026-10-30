using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Application.DTOs;

public record AlimentadorDto(
    int Id, string Codigo, string Nombre, double KcalPorGramo, int IntervaloMinimoHoras,
    RolAlimentador MiRol, EstadoAlimentadorDto Estado);

public record EstadoAlimentadorDto(
    bool EnLinea, bool GatewayEnLinea, double? NivelTolvaPorcentaje, double? PesoPlatoG,
    string? VersionFirmware, string? VersionModelo, DateTimeOffset? UltimaSincronizacion,
    bool DispensadoRemotoDisponible);

public record CrearAlimentadorRequest(string Codigo, string Nombre, double KcalPorGramo, string? GatewayDeviceId);
public record ActualizarAlimentadorRequest(string Nombre, double KcalPorGramo, int IntervaloMinimoHoras);

public record MiembroDto(int UsuarioId, string Nombre, string Email, RolAlimentador Rol);
public record AgregarMiembroRequest(string Email, RolAlimentador Rol);
public record CambiarRolRequest(RolAlimentador Rol);
