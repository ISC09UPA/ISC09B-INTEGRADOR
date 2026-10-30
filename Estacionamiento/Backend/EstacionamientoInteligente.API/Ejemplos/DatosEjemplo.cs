using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.API.Ejemplos;

/// <summary>
/// TEMPORAL. Datos fijos (los mismos de los mockups) para que el front pueda
/// consumir la API mientras se construyen Application e Infrastructure.
/// Cuando cada controller llame a su servicio real, este archivo se borra.
/// </summary>
internal static class DatosEjemplo
{
    private static DateTime Hoy(int hora, int minuto) => DateTime.Today.AddHours(hora).AddMinutes(minuto);

    public static readonly Guid UsuarioId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid AccesoActualId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid VehiculoNoLegibleId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private const string FotoUrl = "https://ejemplo.blob.core.windows.net/fotos-vehiculos/entradas/abc-123-a.jpg";

    // --- Auth ---
    public static UsuarioDto Usuario(RolUsuario rol = RolUsuario.Usuario) =>
        new(UsuarioId, "Vane", "vane@correo.com", rol, ["ABC-123-A"]);

    public static TokenResponse Token(RolUsuario rol) =>
        new("token-de-ejemplo." + rol.ToString().ToLowerInvariant(), DateTime.UtcNow.AddHours(8), Usuario(rol));

    // --- Cajones ---
    public static MapaCajonesDto Mapa() => new(
        Libres: 2,
        Total: 4,
        PlumaAbierta: false,
        Cajones:
        [
            new(1, EstadoCajon.Ocupado, false),
            new(2, EstadoCajon.Libre, false),
            new(3, EstadoCajon.Ocupado, true),
            new(4, EstadoCajon.Libre, false)
        ]);

    public static DetalleCajonDto? Detalle(int numero) => numero switch
    {
        3 => new(3, EstadoCajon.Ocupado, true,
                 new VehiculoEnCajonDto("ABC-123-A", TipoVehiculo.Carro, FotoUrl, Hoy(9, 42), null, 78)),
        1 => new(1, EstadoCajon.Ocupado, false, null),
        2 or 4 => new(numero, EstadoCajon.Libre, false, null),
        _ => null
    };

    // --- Historial ---
    public static AccesoActualDto AccesoActual() => new(AccesoActualId, 3, "ABC-123-A", Hoy(9, 42), 78);

    public static IReadOnlyList<HistorialItemDto> Historial() =>
    [
        new(AccesoActualId, Hoy(9, 42), null, 3, "ABC-123-A", 78, true),
        new(Guid.NewGuid(), Hoy(8, 15).AddDays(-1), Hoy(10, 2).AddDays(-1), 2, "ABC-123-A", 107, false),
        new(Guid.NewGuid(), Hoy(12, 30).AddDays(-2), Hoy(13, 40).AddDays(-2), 2, "ABC-123-A", 70, false),
        new(Guid.NewGuid(), Hoy(7, 58).AddDays(-3), Hoy(9, 51).AddDays(-3), 4, "ABC-123-A", 113, false),
        new(Guid.NewGuid(), Hoy(10, 5).AddDays(-4), Hoy(11, 20).AddDays(-4), 1, "ABC-123-A", 75, false)
    ];

    public static ResumenMesDto Resumen(string mes) => new(mes, 12, 95, 2);

    // --- Estadísticas ---
    public static PanelDto Panel(DateOnly fecha) => new(fecha, 2, 4, 14, 1, 82, 2);

    public static IReadOnlyList<OcupacionHoraDto> OcupacionPorHora() =>
    [
        new(8, 1, 1), new(9, 3, 3), new(10, 4, 3), new(11, 3, 2),
        new(12, 2, 1), new(13, 4, 3), new(14, 3, 1), new(15, 2, 0)
    ];

    public static IReadOnlyList<UsoCajonDto> UsoPorCajon() =>
        [new(1, 9), new(2, 14), new(3, 11), new(4, 6)];

    // --- Vehículos ---
    public static IReadOnlyList<VehiculoDto> Vehiculos() =>
    [
        new(Guid.Parse("44444444-4444-4444-4444-444444444444"), "ABC-123-A", true, TipoVehiculo.Carro,
            EstadoVehiculo.Alta, true, 3, null, "vane@correo.com"),
        new(VehiculoNoLegibleId, null, false, TipoVehiculo.Camioneta,
            EstadoVehiculo.Alta, true, 1, null, null),
        new(Guid.Parse("55555555-5555-5555-5555-555555555555"), "XYZ-987-B", true, TipoVehiculo.Moto,
            EstadoVehiculo.Alta, false, null, Hoy(10, 2), null),
        new(Guid.Parse("66666666-6666-6666-6666-666666666666"), "JKL-456-C", true, TipoVehiculo.Camion,
            EstadoVehiculo.Alta, false, null, Hoy(9, 15), null),
        new(Guid.Parse("77777777-7777-7777-7777-777777777777"), "MNO-321-D", true, TipoVehiculo.Carro,
            EstadoVehiculo.Baja, false, null, null, null)
    ];

    // --- Escáner y pluma ---
    public static AnalisisPlacaDto Analisis() => new(
        Placa: "ABC-123-A",
        Confianza: 0.96,
        Tipo: TipoVehiculo.Carro,
        FotoBlob: "escaner/2026/10/27/ejemplo.jpg",
        FotoUrl: FotoUrl,
        SeRegistraraComo: TipoPaso.Salida,
        EntradaAbierta: Hoy(9, 42),
        SeAbriraPluma: true,
        LugaresLibres: 2);

    public static ResultadoPasoDto ResultadoSalida(string? placa) =>
        new(AccionPluma.Abrir, TipoPaso.Salida, MotivoDecision.SalidaRegistrada, placa ?? "ABC-123-A", AccesoActualId, 78);

    public static ResultadoPasoDto ResultadoEntrada(string? placa) =>
        new(AccionPluma.Abrir, TipoPaso.Entrada, MotivoDecision.EntradaPermitida, placa, Guid.NewGuid(), null);

    public static EstadoPlumaDto EstadoPluma() => new(false, Hoy(9, 42));

    // --- Alertas ---
    public static IReadOnlyList<AlertaDto> Alertas() =>
    [
        new(Guid.Parse("88888888-8888-8888-8888-888888888888"), TipoAlerta.EntradaNegada,
            "Entrada negada: estacionamiento lleno.", "QWE-555-Z", FotoUrl, null, Hoy(11, 5), false),
        new(Guid.Parse("99999999-9999-9999-9999-999999999999"), TipoAlerta.PlacaNoLegible,
            "Entró un vehículo con placa no legible. Corrige la placa.", null, FotoUrl, VehiculoNoLegibleId, Hoy(8, 50), false)
    ];
}
