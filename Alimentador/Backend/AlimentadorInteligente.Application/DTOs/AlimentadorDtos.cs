using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Application.DTOs;

public record AlimentadorDto(
    int Id, string Codigo, string Nombre, double KcalPorGramo, int IntervaloMinimoHoras,
    string ZonaHoraria, RolAlimentador MiRol, EstadoAlimentadorDto Estado,
    int? GatewayId = null, string? GatewayDeviceId = null);

public record EstadoAlimentadorDto(
    bool EnLinea, bool GatewayEnLinea,
    double? NivelTolvaPerroPorcentaje, double? NivelTolvaGatoPorcentaje,
    double? PesoPlatoPerroG, double? PesoPlatoGatoG,
    string? VersionFirmware, string? VersionModelo, DateTimeOffset? UltimaSincronizacion,
    bool DispensadoRemotoDisponible);

public record CrearAlimentadorRequest(
    string Codigo, string Nombre, double KcalPorGramo, string? GatewayDeviceId, string? ZonaHoraria = null);
public record ActualizarAlimentadorRequest(
    string Nombre, double KcalPorGramo, int IntervaloMinimoHoras, string? ZonaHoraria = null, string? GatewayDeviceId = null);

public record GatewayDto(int Id, string DeviceId, DateTimeOffset? UltimoHeartbeat, bool Sincronizando);
public record CrearGatewayRequest(string DeviceId);
public record LigarGatewayRequest(int GatewayId);
/// <summary>La clave se muestra una sola vez; en la BD solo queda su hash.</summary>
public record GatewayClaveResponse(int Id, string DeviceId, string Clave);

public record MiembroDto(int UsuarioId, string Nombre, string Email, RolAlimentador Rol);
public record AgregarMiembroRequest(string Email, RolAlimentador Rol);
public record CambiarRolRequest(RolAlimentador Rol);
