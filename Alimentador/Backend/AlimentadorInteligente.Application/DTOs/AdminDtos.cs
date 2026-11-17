using System.Text.Json.Serialization;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Application.DTOs;

// Contrato del panel de administración (/api/admin). Ver ADMIN_API.md.

/// <summary>Página de resultados; Total cuenta todos los elementos que cumplen el filtro.</summary>
/// <remarks>En C# un miembro no puede llamarse igual que su tipo, por eso NumeroPagina se serializa como "pagina".</remarks>
public record Pagina<T>(
    IReadOnlyList<T> Elementos, int Total, [property: JsonPropertyName("pagina")] int NumeroPagina, int Tamano);

/// <summary>Parámetros de paginación por query string (?pagina=1&amp;tamano=25).</summary>
public abstract record ConsultaPaginada
{
    public int Pagina { get; init; } = 1;
    public int Tamano { get; init; } = Constantes.TamanoPaginaPredeterminado;
}

public record UsuarioResumenDto(int Id, string Nombre, string Email);
public record UsuarioMinimoDto(int Id, string Nombre);
public record GatewayResumenDto(int Id, string DeviceId, bool EnLinea);

// --- Resumen ---

public record ResumenAdminDto(
    ResumenUsuariosDto Usuarios, ResumenAlimentadoresDto Alimentadores, ResumenGatewaysDto Gateways,
    ResumenMascotasDto Mascotas, int Alertas24h, ResumenOtaDto Ota, int FotosPorRevisar,
    IReadOnlyList<VersionConteoDto> VersionesFirmware, IReadOnlyList<VersionConteoDto> VersionesModelo);

public record ResumenUsuariosDto(int Total, int Activos, int Administradores, int Nuevos7Dias);
public record ResumenAlimentadoresDto(int Total, int EnLinea, int SinConexion, int SinGateway);
public record ResumenGatewaysDto(int Total, int EnLinea, int SinConexion, int Sincronizando);
public record ResumenMascotasDto(int Activas, int Perros, int Gatos);
/// <summary>EnCurso: OTA pendientes o entregadas. Fallidas7Dias no cuenta las canceladas por un administrador.</summary>
public record ResumenOtaDto(int Artefactos, int EnCurso, int Fallidas7Dias);
/// <summary>Version null: alimentadores que nunca reportaron versión.</summary>
public record VersionConteoDto(string? Version, int Alimentadores);

// --- Usuarios ---

public record ConsultaUsuarios : ConsultaPaginada
{
    /// <summary>Filtra por nombre o correo, sin distinguir mayúsculas.</summary>
    public string? Buscar { get; init; }
}

public record UsuarioAdminDto(
    int Id, string Nombre, string Email, bool EsAdministrador, bool Activo,
    DateTimeOffset CreadoEn, DateTimeOffset? UltimoAcceso, int Alimentadores, int Gateways);

public record UsuarioAdminDetalleDto(
    int Id, string Nombre, string Email, bool EsAdministrador, bool Activo,
    DateTimeOffset CreadoEn, DateTimeOffset? UltimoAcceso, int Alimentadores, int Gateways,
    IReadOnlyList<MembresiaAdminDto> Membresias, IReadOnlyList<GatewayResumenDto> ListaGateways);

public record MembresiaAdminDto(int AlimentadorId, string Codigo, string Nombre, RolAlimentador Rol);

public record CambiarAdministradorRequest(bool EsAdministrador);
public record CambiarActivoRequest(bool Activo);

// --- Alimentadores ---

public record ConsultaAlimentadores : ConsultaPaginada
{
    /// <summary>Filtra por código, nombre o correo del dueño.</summary>
    public string? Buscar { get; init; }
    /// <summary>todos | enLinea | sinConexion | sinGateway.</summary>
    public string? Estado { get; init; }
}

public record AlimentadorAdminDto(
    int Id, string Codigo, string Nombre, string ZonaHoraria, UsuarioResumenDto? Dueno,
    int Miembros, int Mascotas, GatewayResumenDto? Gateway, EstadoAlimentadorDto Estado,
    int VersionConfiguracion, DateTimeOffset CreadoEn);

public record AlimentadorAdminDetalleDto(
    int Id, string Codigo, string Nombre, string ZonaHoraria, UsuarioResumenDto? Dueno,
    int Miembros, int Mascotas, GatewayResumenDto? Gateway, EstadoAlimentadorDto Estado,
    int VersionConfiguracion, DateTimeOffset CreadoEn,
    double KcalPorGramo, int IntervaloMinimoHoras,
    IReadOnlyList<MiembroDto> ListaMiembros, IReadOnlyList<MascotaAdminDto> ListaMascotas,
    IReadOnlyList<HorarioAdminDto> Horarios, IReadOnlyList<ComandoAdminDto> UltimosComandos,
    IReadOnlyList<AlertaDto> UltimasAlertas);

/// <summary>Incluye las mascotas dadas de baja (Activa = false).</summary>
public record MascotaAdminDto(
    int Id, string Nombre, Especie Especie, int Tolva, double PesoKg, int EdadMeses, int ComidasPorDia,
    string? EtiquetaRfid, double AjustePorcentaje, double GramosPorDiaRecomendados, bool Activa,
    DateTimeOffset? UltimaVisita);

/// <summary>Hora en formato HH:mm.</summary>
public record HorarioAdminDto(int Id, string Hora, int? MascotaId, bool Activo);

// --- Comandos y OTA ---

public record ArtefactoResumenDto(int Id, TipoArtefactoOta Tipo, string Version);

public record ComandoAdminDto(
    int Id, int AlimentadorId, string AlimentadorCodigo, string AlimentadorNombre,
    TipoComando Tipo, EstadoComando Estado, ArtefactoResumenDto? Artefacto, UsuarioMinimoDto? SolicitadoPor,
    DateTimeOffset CreadoEn, DateTimeOffset? EntregadoEn, DateTimeOffset? CompletadoEn,
    double? Gramos, double? DispensadoG, string? Error);

public record CrearDespliegueOtaRequest(int ArtefactoId, IReadOnlyList<int> AlimentadorIds, bool OmitirSiYaTieneVersion);
public record DespliegueOmitidoDto(int AlimentadorId, string Motivo);
public record DespliegueOtaResponse(IReadOnlyList<ComandoAdminDto> Creados, IReadOnlyList<DespliegueOmitidoDto> Omitidos);

public record ConsultaDespliegues : ConsultaPaginada
{
    public EstadoComando? Estado { get; init; }
    public int? ArtefactoId { get; init; }
    public int? AlimentadorId { get; init; }
}

// --- Embebidos ---

public record GatewayAdminDto(
    int Id, string DeviceId, UsuarioResumenDto? Propietario, DateTimeOffset? UltimoHeartbeat, bool EnLinea,
    DateTimeOffset? SinConexionDesde, bool Sincronizando, DateTimeOffset? SincronizandoDesde,
    DateTimeOffset CreadoEn, IReadOnlyList<AlimentadorEmbebidoDto> Alimentadores);

/// <summary>Estado del ESP32 tal como lo reportó la Pi en el último heartbeat.</summary>
public record AlimentadorEmbebidoDto(
    int Id, string Codigo, string Nombre, bool EnLinea, DateTimeOffset? UltimoEstado,
    string? VersionFirmware, string? VersionModelo,
    double? NivelTolvaPerroPorcentaje, double? NivelTolvaGatoPorcentaje);

public record ConsultaEventos : ConsultaPaginada
{
    public int? AlimentadorId { get; init; }
    public TipoEvento? Tipo { get; init; }
}

public record EventoAdminDto(
    int Id, int AlimentadorId, string AlimentadorCodigo, TipoEvento Tipo, int? Tolva,
    DateTimeOffset OcurridoEn, string? Detalle);

public record ConsultaFotos : ConsultaPaginada
{
    /// <summary>pendientes (predeterminado) | revisadas | todas.</summary>
    public string? Estado { get; init; }
}

/// <summary>Url: SAS de lectura de 15 min; null si la foto no se ha subido.</summary>
public record FotoDudosaAdminDto(
    int Id, int AlimentadorId, string AlimentadorCodigo, ClaseDetectada ClasePredicha, double Confianza,
    DateTimeOffset TomadaEn, bool Subida, ClaseDetectada? ClaseRevisada, string? Url);

public record RevisarFotoRequest(ClaseDetectada Clase);
