using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegistrarAsync(RegistroRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default);
    Task LogoutAsync(RefreshRequest request, CancellationToken ct = default);
    Task GuardarPushTokenAsync(PushTokenRequest request, CancellationToken ct = default);
}

/// <summary>Verifica el rol del usuario actual en un alimentador (RF-19).</summary>
public interface IAccesoAlimentador
{
    Task<RolAlimentador> RequerirAccesoAsync(int alimentadorId, CancellationToken ct = default);
    Task RequerirDuenoAsync(int alimentadorId, CancellationToken ct = default);
}

public interface IAlimentadorService
{
    Task<IReadOnlyList<AlimentadorDto>> ListarAsync(CancellationToken ct = default);
    Task<AlimentadorDto> ObtenerAsync(int id, CancellationToken ct = default);
    Task<AlimentadorDto> CrearAsync(CrearAlimentadorRequest request, CancellationToken ct = default);
    Task<AlimentadorDto> ActualizarAsync(int id, ActualizarAlimentadorRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<MiembroDto>> ListarMiembrosAsync(int id, CancellationToken ct = default);
    Task<MiembroDto> AgregarMiembroAsync(int id, AgregarMiembroRequest request, CancellationToken ct = default);
    Task CambiarRolAsync(int id, int usuarioId, CambiarRolRequest request, CancellationToken ct = default);
    Task QuitarMiembroAsync(int id, int usuarioId, CancellationToken ct = default);
}

public interface IMascotaService
{
    Task<IReadOnlyList<MascotaDto>> ListarAsync(int alimentadorId, CancellationToken ct = default);
    Task<MascotaDto> ObtenerAsync(int id, CancellationToken ct = default);
    Task<MascotaDto> CrearAsync(int alimentadorId, GuardarMascotaRequest request, CancellationToken ct = default);
    Task<MascotaDto> ActualizarAsync(int id, GuardarMascotaRequest request, CancellationToken ct = default);
    Task EliminarAsync(int id, CancellationToken ct = default);
}

public interface IHorarioService
{
    Task<IReadOnlyList<HorarioDto>> ListarAsync(int alimentadorId, CancellationToken ct = default);
    Task<HorarioDto> CrearAsync(int alimentadorId, GuardarHorarioRequest request, CancellationToken ct = default);
    Task<HorarioDto> ActualizarAsync(int id, GuardarHorarioRequest request, CancellationToken ct = default);
    Task EliminarAsync(int id, CancellationToken ct = default);
}

public interface IHistorialService
{
    Task<IReadOnlyList<VisitaDto>> ListarVisitasAsync(int mascotaId, DateTimeOffset? desde, DateTimeOffset? hasta, CancellationToken ct = default);
    Task<IReadOnlyList<ConsumoDiarioDto>> ConsumoDiarioAsync(int mascotaId, DateOnly desde, DateOnly hasta, CancellationToken ct = default);
}

public interface IAlertaService
{
    Task<IReadOnlyList<AlertaDto>> ListarAsync(int alimentadorId, bool soloNoLeidas, CancellationToken ct = default);
    Task MarcarLeidaAsync(int id, CancellationToken ct = default);
    /// <summary>Crea la alerta, la manda por SignalR y por push. Uso interno (dispositivo y tareas).</summary>
    Task CrearAsync(int alimentadorId, int? mascotaId, TipoAlerta tipo, string mensaje, DateTimeOffset ocurridaEn, CancellationToken ct = default);
}

public interface IComandoService
{
    Task<ComandoDto> DispensarAsync(int alimentadorId, DispensarRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ComandoDto>> ListarAsync(int alimentadorId, CancellationToken ct = default);
}

/// <summary>Endpoints que consume la Raspberry Pi (sección 8.2).</summary>
public interface IDispositivoService
{
    Task<ConfiguracionDispositivoDto?> ObtenerConfiguracionAsync(int gatewayId, int version, CancellationToken ct = default);
    Task<HeartbeatResponse> HeartbeatAsync(int gatewayId, HeartbeatRequest request, CancellationToken ct = default);
    Task<LoteResponse> RegistrarVisitasAsync(int gatewayId, IReadOnlyList<VisitaDispositivoDto> visitas, CancellationToken ct = default);
    Task<LoteResponse> RegistrarEventosAsync(int gatewayId, IReadOnlyList<EventoDispositivoDto> eventos, CancellationToken ct = default);
    Task<IReadOnlyList<ComandoDispositivoDto>> ObtenerComandosAsync(int gatewayId, CancellationToken ct = default);
    Task ReportarResultadoAsync(int gatewayId, int comandoId, ResultadoComandoRequest request, CancellationToken ct = default);
    Task<SolicitudFotoResponse> SolicitarSubidaFotoAsync(int gatewayId, SolicitudFotoRequest request, CancellationToken ct = default);
}

/// <summary>Lógica de las tareas programadas (BackgroundService).</summary>
public interface IMonitoreoService
{
    /// <summary>Ajuste nocturno de raciones (RF-16).</summary>
    Task AjustarRacionesAsync(CancellationToken ct = default);
    /// <summary>Alertas de alimentador / Raspberry Pi sin conexión (RF-17).</summary>
    Task RevisarConexionesAsync(CancellationToken ct = default);
    /// <summary>No ha comido, baja de apetito y palomas frecuentes (RF-17, RF-26).</summary>
    Task DetectarAnomaliasAsync(CancellationToken ct = default);
}
