using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Services;

namespace AlimentadorInteligente.Application.Services;

internal static class Mapeos
{
    public static MascotaDto ADto(this Mascota m, double kcalPorGramo) => new(
        m.Id, m.AlimentadorId, m.Nombre, m.Especie, m.PesoKg, m.EdadMeses, m.NivelActividad,
        m.Esterilizado, m.ComidasPorDia, m.EtiquetaRfid, m.AjustePorcentaje,
        Math.Round(CalculadoraRacion.GramosPorDia(m, kcalPorGramo), 1),
        Math.Round(CalculadoraRacion.GramosPorComida(m, kcalPorGramo), 1));

    public static HorarioDto ADto(this Horario h) => new(h.Id, h.MascotaId, h.Hora, h.Activo);

    public static VisitaDto ADto(this Visita v) => new(
        v.Id, v.EventId, v.MascotaId, v.Clase, v.Confianza, v.IniciadaEn, v.TerminadaEn,
        v.PlatoAntesG, v.DispensadoG, v.PlatoDespuesG, v.ConsumidoG);

    public static AlertaDto ADto(this Alerta a) => new(
        a.Id, a.AlimentadorId, a.MascotaId, a.Tipo, a.Mensaje, a.OcurridaEn, a.CreadoEn, a.Leida);

    public static ComandoDto ADto(this Comando c) => new(
        c.Id, c.AlimentadorId, c.Tipo, c.Estado, c.MascotaId, c.Gramos, c.DispensadoG, c.Error, c.CreadoEn);

    public static EstadoAlimentadorDto Estado(this Alimentador a)
    {
        bool gatewayEnLinea = a.Gateway is { SinConexionDesde: null, UltimoHeartbeat: { } ultimo }
                              && DateTimeOffset.UtcNow - ultimo < Constantes.ToleranciaHeartbeat;
        return new EstadoAlimentadorDto(
            a.EnLinea, gatewayEnLinea, a.NivelTolvaPorcentaje, a.PesoPlatoG,
            a.VersionFirmware, a.VersionModelo, a.Gateway?.UltimoHeartbeat,
            // RF-25: sin conexión se desactiva el dispensado remoto
            DispensadoRemotoDisponible: a.EnLinea && gatewayEnLinea);
    }
}
