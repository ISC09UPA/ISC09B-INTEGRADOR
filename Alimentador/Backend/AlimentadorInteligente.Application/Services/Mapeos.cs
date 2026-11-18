using System.Linq.Expressions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Services;

namespace AlimentadorInteligente.Application.Services;

internal static class Mapeos
{
    public static MascotaDto ADto(this Mascota m, double kcalPorGramo) => new(
        m.Id, m.AlimentadorId, m.Nombre, m.Especie, m.Tolva, m.PesoKg, m.EdadMeses, m.NivelActividad,
        m.Esterilizado, m.ComidasPorDia, m.EtiquetaRfid, m.AjustePorcentaje,
        Math.Round(CalculadoraRacion.GramosPorDia(m, kcalPorGramo), 1),
        Math.Round(CalculadoraRacion.GramosPorComida(m, kcalPorGramo), 1));

    public static string MensajeConexionRestablecida(int visitas) => visitas switch
    {
        0 => "La conexión se restableció.",
        1 => "La conexión se restableció; se sincronizó 1 visita.",
        _ => $"La conexión se restableció; se sincronizaron {visitas} visitas."
    };

    public static HorarioDto ADto(this Horario h) => new(h.Id, h.MascotaId, h.Hora, h.Activo);

    public static VisitaDto ADto(this Visita v) => new(
        v.Id, v.EventId, v.MascotaId, v.Clase, v.Confianza, v.IniciadaEn, v.TerminadaEn,
        v.PlatoAntesG, v.DispensadoG, v.PlatoDespuesG, v.ConsumidoG);

    public static AlertaDto ADto(this Alerta a) => new(
        a.Id, a.AlimentadorId, a.MascotaId, a.Tipo, a.Mensaje, a.OcurridaEn, a.CreadoEn, a.Leida);

    public static ComandoDto ADto(this Comando c) => new(
        c.Id, c.AlimentadorId, c.Tipo, c.Estado, c.MascotaId, c.Tolva, c.Gramos, c.DispensadoG, c.Error, c.CreadoEn);

    /// <summary>Proyección traducible a SQL de un comando para el panel de administración.</summary>
    public static readonly Expression<Func<Comando, ComandoAdminDto>> ComandoAdmin = c => new ComandoAdminDto(
        c.Id, c.AlimentadorId, c.Alimentador.Codigo, c.Alimentador.Nombre, c.Tipo, c.Estado,
        c.ArtefactoOta == null ? null : new ArtefactoResumenDto(c.ArtefactoOta.Id, c.ArtefactoOta.Tipo, c.ArtefactoOta.Version),
        c.SolicitadoPor == null ? null : new UsuarioMinimoDto(c.SolicitadoPor.Id, c.SolicitadoPor.Nombre),
        c.CreadoEn, c.EntregadoEn, c.CompletadoEn, c.Gramos, c.DispensadoG, c.Error);

    /// <summary>
    /// Una Pi está en línea si no reportó un periodo sin conexión y su último heartbeat es posterior a este
    /// límite. Es la misma regla de Estado(), escrita para que EF la traduzca a SQL.
    /// </summary>
    public static DateTimeOffset LimiteHeartbeat(DateTimeOffset ahora) => ahora - Constantes.ToleranciaHeartbeat;

    public static EstadoAlimentadorDto Estado(this Alimentador a) => a.Estado(a.Gateway);

    /// <summary>Para consultas sin seguimiento donde la Pi se proyecta aparte del alimentador.</summary>
    public static EstadoAlimentadorDto Estado(this Alimentador a, Gateway? gateway)
    {
        bool gatewayEnLinea = gateway is { SinConexionDesde: null, UltimoHeartbeat: { } ultimo }
                              && DateTimeOffset.UtcNow - ultimo < Constantes.ToleranciaHeartbeat;
        return new EstadoAlimentadorDto(
            a.EnLinea, gatewayEnLinea,
            a.NivelTolvaPerroPorcentaje, a.NivelTolvaGatoPorcentaje,
            a.PesoPlatoPerroG, a.PesoPlatoGatoG,
            a.VersionFirmware, a.VersionModelo, gateway?.UltimoHeartbeat,
            // RF-25: sin conexión se desactiva el dispensado remoto
            DispensadoRemotoDisponible: a.EnLinea && gatewayEnLinea);
    }
}
