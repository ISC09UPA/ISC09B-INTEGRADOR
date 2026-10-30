using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.Servicios;

/// <summary>
/// Lo que se sabe en el momento en que un vehículo llega a la pluma.
/// Lo arma la capa Application con datos de la base; aquí solo se decide.
/// </summary>
/// <param name="PlacaLegible">Computer Vision pudo leer la placa.</param>
/// <param name="TieneEntradaAbierta">La placa tiene un acceso con entrada y sin salida.</param>
/// <param name="UltimoPasoMismaPlaca">Hora del último paso registrado de esa placa (entrada o salida).</param>
/// <param name="CajonesLibres">Cajones que los sensores IR reportan libres.</param>
/// <param name="AutosEnTransito">Autos que ya entraron pero todavía no ocupan cajón.</param>
public sealed record ContextoPaso(
    bool PlacaLegible,
    bool TieneEntradaAbierta,
    DateTime? UltimoPasoMismaPlaca,
    int CajonesLibres,
    int AutosEnTransito,
    DateTime Ahora);

/// <summary>Qué hacer con la pluma y cómo registrar el paso.</summary>
public sealed record DecisionPaso(AccionPluma Accion, TipoPaso Tipo, MotivoDecision Motivo)
{
    /// <summary>Si hay que guardar una entrada o salida. Las lecturas repetidas no se guardan.</summary>
    public bool DebeRegistrar => Motivo is MotivoDecision.EntradaPermitida or MotivoDecision.SalidaRegistrada;
}

/// <summary>
/// Reglas del negocio del estacionamiento (sección "Reglas para los casos difíciles" del plan).
/// Son funciones puras: no leen la base ni llaman a Azure, así se pueden probar solas.
/// </summary>
public static class ReglasAcceso
{
    /// <summary>Cajones de la maqueta.</summary>
    public const int TotalCajones = 4;

    /// <summary>Tiempo en que se ignoran lecturas repetidas de la misma placa.</summary>
    public static readonly TimeSpan VentanaLecturaRepetida = TimeSpan.FromSeconds(10);

    /// <summary>Tiempo que un auto puede estar dentro sin cajón antes de avisar al administrador.</summary>
    public static readonly TimeSpan TiempoMaximoSinCajon = TimeSpan.FromMinutes(10);

    /// <summary>
    /// Decide si la pluma abre y si el paso es entrada o salida.
    /// La cámara no sabe hacia dónde va el auto: lo que distingue una salida
    /// es que la placa ya tenga una entrada abierta.
    /// </summary>
    public static DecisionPaso Decidir(ContextoPaso c)
    {
        // 1. Misma placa leída otra vez en pocos segundos: se ignora.
        //    Si ya tiene entrada abierta, la lectura anterior fue esa entrada; si no, fue su salida.
        if (c.PlacaLegible && c.UltimoPasoMismaPlaca is { } ultimo && c.Ahora - ultimo < VentanaLecturaRepetida)
        {
            var tipoAnterior = c.TieneEntradaAbierta ? TipoPaso.Entrada : TipoPaso.Salida;
            return new DecisionPaso(AccionPluma.Negar, tipoAnterior, MotivoDecision.LecturaRepetida);
        }

        // 2. Tiene entrada abierta: es una salida y siempre abre, aunque esté lleno.
        if (c.TieneEntradaAbierta)
            return new DecisionPaso(AccionPluma.Abrir, TipoPaso.Salida, MotivoDecision.SalidaRegistrada);

        // 3. Es una entrada (incluye placa no legible y autos que salen sin entrada registrada):
        //    abre solo si hay lugar, sin importar la placa.
        return LugaresDisponibles(c.CajonesLibres, c.AutosEnTransito) > 0
            ? new DecisionPaso(AccionPluma.Abrir, TipoPaso.Entrada, MotivoDecision.EntradaPermitida)
            : new DecisionPaso(AccionPluma.Negar, TipoPaso.Entrada, MotivoDecision.EstacionamientoLleno);
    }

    /// <summary>
    /// Lugares que de verdad se pueden ofrecer. Un auto que acaba de entrar todavía
    /// no activa ningún sensor, pero ya tiene un lugar "apartado"; sin restarlo,
    /// con 1 cajón libre podrían entrar 2 autos seguidos.
    /// </summary>
    public static int LugaresDisponibles(int cajonesLibres, int autosEnTransito) =>
        Math.Max(0, cajonesLibres - autosEnTransito);

    /// <summary>
    /// Un sensor detectó un auto: se asigna el cajón al acceso abierto
    /// sin cajón más reciente (regla 6 del proceso de entrada del plan).
    /// </summary>
    public static Acceso? ElegirAccesoParaCajon(IEnumerable<Acceso> accesos) =>
        accesos
            .Where(a => a.EnTransito)
            .OrderByDescending(a => a.SinCajonDesde ?? a.HoraEntrada)
            .FirstOrDefault();

    /// <summary>Un auto dentro lleva demasiado tiempo sin cajón y sin salir.</summary>
    public static bool RequiereAlertaSinCajon(Acceso acceso, DateTime ahora) =>
        acceso.EnTransito
        && acceso.SinCajonDesde is { } desde
        && ahora - desde >= TiempoMaximoSinCajon;
}
