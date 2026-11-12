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
    /// <summary>Para SignalR, donde el usuario viene de la conexión y no de la petición HTTP.</summary>
    Task<bool> EsMiembroAsync(int alimentadorId, int usuarioId, CancellationToken ct = default);
}

/// <summary>Alta de las Raspberry Pi y de su clave (RNF-07).</summary>
public interface IGatewayService
{
    Task<IReadOnlyList<GatewayDto>> ListarAsync(CancellationToken ct = default);
    Task<GatewayClaveResponse> CrearAsync(CrearGatewayRequest request, CancellationToken ct = default);
    Task<GatewayClaveResponse> RegenerarClaveAsync(int id, CancellationToken ct = default);
}

public interface IAlimentadorService
{
    Task<IReadOnlyList<AlimentadorDto>> ListarAsync(CancellationToken ct = default);
    Task<AlimentadorDto> ObtenerAsync(int id, CancellationToken ct = default);
    Task<AlimentadorDto> CrearAsync(CrearAlimentadorRequest request, CancellationToken ct = default);
    Task<AlimentadorDto> ActualizarAsync(int id, ActualizarAlimentadorRequest request, CancellationToken ct = default);
    /// <summary>Liga el alimentador a una Raspberry Pi. Dueño del alimentador y propietario de la Pi.</summary>
    Task<AlimentadorDto> LigarGatewayAsync(int id, LigarGatewayRequest request, CancellationToken ct = default);
    /// <summary>Quita la Raspberry Pi del alimentador. Solo el dueño.</summary>
    Task<AlimentadorDto> DesligarGatewayAsync(int id, CancellationToken ct = default);
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
    Task<IReadOnlyList<ArtefactoOtaDto>> ListarArtefactosAsync(CancellationToken ct = default);
    /// <summary>Encola una actualización de firmware o modelo (RF-15). Solo el dueño.</summary>
    Task<ComandoDto> LanzarOtaAsync(int alimentadorId, LanzarOtaRequest request, CancellationToken ct = default);
}

/// <summary>Publicación de firmware y modelos para OTA (RF-15). Solo administradores (Ota:Administradores).</summary>
public interface IOtaService
{
    /// <summary>Sube el archivo al contenedor "ota", calcula SHA-256 y tamaño y registra el artefacto.</summary>
    Task<ArtefactoOtaDto> PublicarAsync(PublicarArtefactoRequest request, Stream contenido, CancellationToken ct = default);
    /// <summary>Borra un artefacto que ningún comando haya usado.</summary>
    Task EliminarAsync(int id, CancellationToken ct = default);
}

/// <summary>Endpoints que consume la Raspberry Pi (sección 8.2).</summary>
public interface IDispositivoService
{
    Task<ConfiguracionDispositivoDto?> ObtenerConfiguracionAsync(int gatewayId, int version, CancellationToken ct = default);
    Task<HeartbeatResponse> HeartbeatAsync(int gatewayId, HeartbeatRequest request, CancellationToken ct = default);
    /// <summary>La Pi terminó de vaciar su cola tras volver internet (RF-24).</summary>
    Task TerminarSincronizacionAsync(int gatewayId, CancellationToken ct = default);
    Task<LoteResponse> RegistrarVisitasAsync(int gatewayId, IReadOnlyList<VisitaDispositivoDto> visitas, CancellationToken ct = default);
    Task<LoteResponse> RegistrarEventosAsync(int gatewayId, IReadOnlyList<EventoDispositivoDto> eventos, CancellationToken ct = default);
    Task<IReadOnlyList<ComandoDispositivoDto>> ObtenerComandosAsync(int gatewayId, CancellationToken ct = default);
    Task ReportarResultadoAsync(int gatewayId, int comandoId, ResultadoComandoRequest request, CancellationToken ct = default);
    Task<SolicitudFotoResponse> SolicitarSubidaFotoAsync(int gatewayId, SolicitudFotoRequest request, CancellationToken ct = default);
    Task ConfirmarFotoAsync(int gatewayId, ConfirmarFotoRequest request, CancellationToken ct = default);
}

/// <summary>Lógica de las tareas programadas (BackgroundService).</summary>
public interface IMonitoreoService
{
    /// <summary>Ajuste nocturno de raciones (RF-16).</summary>
    Task AjustarRacionesAsync(CancellationToken ct = default);
    /// <summary>Alertas de alimentador / Raspberry Pi sin conexión (RF-17).</summary>
    Task RevisarConexionesAsync(CancellationToken ct = default);
    /// <summary>Cierra los comandos vencidos o sin respuesta para que la app no se quede esperando.</summary>
    Task RevisarComandosAsync(CancellationToken ct = default);
    /// <summary>No ha comido y baja de apetito (RF-17, RF-26).</summary>
    Task DetectarAnomaliasAsync(CancellationToken ct = default);
}
