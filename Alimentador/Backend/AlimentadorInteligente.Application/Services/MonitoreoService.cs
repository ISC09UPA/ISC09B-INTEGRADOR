using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using AlimentadorInteligente.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class MonitoreoService(IAppDbContext db, IAlertaService alertas, TimeProvider reloj) : IMonitoreoService
{
    public async Task RevisarConexionesAsync(CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow();
        var limite = ahora - Constantes.LimiteSinConexion;

        // Raspberry Pi sin heartbeat en 30 min: una sola alerta hasta que vuelva
        var gatewaysCaidos = await db.Gateways.Include(g => g.Alimentadores)
            .Where(g => !g.AlertaSinConexionEnviada && g.UltimoHeartbeat != null && g.UltimoHeartbeat < limite)
            .ToListAsync(ct);
        foreach (var g in gatewaysCaidos)
        {
            g.SinConexionDesde = g.UltimoHeartbeat;
            g.AlertaSinConexionEnviada = true;
        }
        await db.SaveChangesAsync(ct);
        foreach (var a in gatewaysCaidos.SelectMany(g => g.Alimentadores))
            await alertas.CrearAsync(a.Id, null, TipoAlerta.GatewaySinConexion,
                "La Raspberry Pi no se ha comunicado en 30 minutos. El alimentador sigue funcionando con su última configuración.", ahora, ct);

        // ESP32 sin estado en 30 min, solo si la Pi sí está en línea (si no, no se puede saber)
        var alimentadoresCaidos = await db.Alimentadores
            .Where(a => !a.AlertaSinConexionEnviada && a.UltimoEstado != null && a.UltimoEstado < limite
                        && a.Gateway != null && a.Gateway.SinConexionDesde == null)
            .ToListAsync(ct);
        foreach (var a in alimentadoresCaidos)
        {
            a.EnLinea = false;
            a.AlertaSinConexionEnviada = true;
        }
        await db.SaveChangesAsync(ct);
        foreach (var a in alimentadoresCaidos)
            await alertas.CrearAsync(a.Id, null, TipoAlerta.AlimentadorSinConexion,
                $"El alimentador {a.Nombre} no ha reportado su estado en 30 minutos.", ahora, ct);
    }

    public async Task DetectarAnomaliasAsync(CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow();
        // RF-26: no se evalúa mientras la Pi está sin conexión; al volver, las visitas traen su hora real
        var mascotas = await db.Mascotas.Include(m => m.Alimentador).ThenInclude(a => a.Gateway)
            .Where(m => m.Alimentador.Gateway != null && m.Alimentador.Gateway.SinConexionDesde == null)
            .ToListAsync(ct);

        foreach (var m in mascotas)
        {
            await RevisarNoHaComidoAsync(m, ahora, ct);
            await RevisarBajaApetitoAsync(m, ahora, ct);
        }

        await RevisarPalomasAsync(ahora, ct);
    }

    public async Task AjustarRacionesAsync(CancellationToken ct = default)
    {
        // TODO: usar la zona horaria del alimentador para definir "día"; por ahora UTC.
        var hoy = DateOnly.FromDateTime(reloj.GetUtcNow().UtcDateTime);
        var ultimoDia = hoy.AddDays(-1);
        var finVentana = Inicio(hoy);
        var inicioVentana = Inicio(hoy.AddDays(-3));

        var mascotas = await db.Mascotas.Include(m => m.Alimentador).ThenInclude(a => a.Gateway)
            .Where(m => !m.Ajustes.Any(a => a.Dia == ultimoDia))
            .ToListAsync(ct);

        foreach (var m in mascotas)
        {
            // Solo días con datos completos: la Pi debe haber reportado después de que terminó la ventana
            var gateway = m.Alimentador.Gateway;
            if (gateway is null || gateway.SinConexionDesde is not null || gateway.UltimoHeartbeat < finVentana)
                continue;

            var visitas = await db.Visitas.AsNoTracking()
                .Where(v => v.MascotaId == m.Id && v.IniciadaEn >= inicioVentana && v.IniciadaEn < finVentana)
                .Select(v => new { v.IniciadaEn, v.DispensadoG, v.ConsumidoG })
                .ToListAsync(ct);

            var dias = Enumerable.Range(1, 3)
                .Select(i => hoy.AddDays(-i))
                .Select(d =>
                {
                    var delDia = visitas.Where(v => DateOnly.FromDateTime(v.IniciadaEn.UtcDateTime) == d).ToList();
                    return (delDia.Sum(v => v.DispensadoG), delDia.Sum(v => v.ConsumidoG));
                })
                .ToList();

            var anterior = m.AjustePorcentaje;
            var nuevo = CalculadoraRacion.CalcularNuevoAjuste(anterior, dias);
            db.AjustesRacion.Add(new AjusteRacion
            {
                MascotaId = m.Id,
                Dia = ultimoDia,
                AjusteAnterior = anterior,
                AjusteNuevo = nuevo,
                Motivo = nuevo < anterior ? "Consumo menor al 85 % de lo dispensado"
                       : nuevo > anterior ? "Se comió todo los 3 días"
                       : "Sin cambio"
            });
            if (nuevo != anterior)
            {
                m.AjustePorcentaje = nuevo;
                m.Alimentador.VersionConfiguracion++;
            }
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task RevisarNoHaComidoAsync(Mascota m, DateTimeOffset ahora, CancellationToken ct)
    {
        var ultimaVisita = await db.Visitas.Where(v => v.MascotaId == m.Id && v.ConsumidoG > 0)
            .MaxAsync(v => (DateTimeOffset?)v.IniciadaEn, ct) ?? m.CreadoEn;
        if (ahora - ultimaVisita < Constantes.LimiteSinComer) return;

        bool yaAlertado = await db.Alertas.AnyAsync(a =>
            a.MascotaId == m.Id && a.Tipo == TipoAlerta.NoHaComido && a.OcurridaEn > ultimaVisita, ct);
        if (yaAlertado) return;

        await alertas.CrearAsync(m.AlimentadorId, m.Id, TipoAlerta.NoHaComido,
            $"{m.Nombre} no ha comido en más de 12 horas.", ahora, ct);
    }

    private async Task RevisarBajaApetitoAsync(Mascota m, DateTimeOffset ahora, CancellationToken ct)
    {
        var hoy = DateOnly.FromDateTime(ahora.UtcDateTime);
        var ayer = hoy.AddDays(-1);
        if (await db.Alertas.AnyAsync(a => a.MascotaId == m.Id && a.Tipo == TipoAlerta.BajaApetito
                                           && a.OcurridaEn >= Inicio(hoy), ct))
            return;

        var visitas = await db.Visitas.AsNoTracking()
            .Where(v => v.MascotaId == m.Id && v.IniciadaEn >= Inicio(hoy.AddDays(-8)) && v.IniciadaEn < Inicio(hoy))
            .Select(v => new { v.IniciadaEn, v.ConsumidoG })
            .ToListAsync(ct);
        if (visitas.Count == 0) return;

        double consumoAyer = visitas.Where(v => v.IniciadaEn >= Inicio(ayer)).Sum(v => v.ConsumidoG);
        double promedio7 = visitas.Where(v => v.IniciadaEn < Inicio(ayer)).Sum(v => v.ConsumidoG) / 7;
        if (promedio7 <= 0 || consumoAyer >= promedio7 * Constantes.UmbralBajaApetito) return;

        await alertas.CrearAsync(m.AlimentadorId, m.Id, TipoAlerta.BajaApetito,
            $"{m.Nombre} comió ayer {consumoAyer:0} g, menos del 70 % de su promedio ({promedio7:0} g).", ahora, ct);
    }

    private async Task RevisarPalomasAsync(DateTimeOffset ahora, CancellationToken ct)
    {
        var hoy = DateOnly.FromDateTime(ahora.UtcDateTime);
        var conteos = await db.Eventos
            .Where(e => e.Tipo == TipoEvento.Pigeon && e.OcurridoEn >= Inicio(hoy))
            .GroupBy(e => e.AlimentadorId)
            .Select(g => new { AlimentadorId = g.Key, Total = g.Count() })
            .Where(g => g.Total > Constantes.MaxPalomasPorDia)
            .ToListAsync(ct);

        foreach (var c in conteos)
        {
            bool yaAlertado = await db.Alertas.AnyAsync(a => a.AlimentadorId == c.AlimentadorId
                && a.Tipo == TipoAlerta.PalomasFrecuentes && a.OcurridaEn >= Inicio(hoy), ct);
            if (!yaAlertado)
                await alertas.CrearAsync(c.AlimentadorId, null, TipoAlerta.PalomasFrecuentes,
                    $"Se detectaron {c.Total} palomas hoy en el alimentador.", ahora, ct);
        }
    }

    private static DateTimeOffset Inicio(DateOnly dia) => new(dia.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
}
