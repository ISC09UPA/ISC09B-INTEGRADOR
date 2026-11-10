using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using AlimentadorInteligente.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class MonitoreoService(
    IAppDbContext db, IAlertaService alertas, INotificadorTiempoReal notificador, TimeProvider reloj) : IMonitoreoService
{
    public async Task RevisarConexionesAsync(CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow();
        var limite = ahora - Constantes.LimiteSinConexion;
        await CerrarSincronizacionesVencidasAsync(ahora, ct);

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

    public async Task RevisarComandosAsync(CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow();
        var abiertos = await db.Comandos
            .Where(c => c.Estado == EstadoComando.Pendiente || c.Estado == EstadoComando.Entregado)
            .ToListAsync(ct);

        var cerrados = new List<Comando>();
        foreach (var c in abiertos)
        {
            if (c.Estado == EstadoComando.Pendiente && c.EstaVencido(ahora))
            {
                c.Estado = EstadoComando.Vencido;
            }
            else if (c.SinResultado(ahora))
            {
                c.Estado = EstadoComando.Fallido;
                c.Error = "El alimentador no respondió.";
            }
            else continue;

            c.CompletadoEn = ahora;
            cerrados.Add(c);
        }
        await db.SaveChangesAsync(ct);

        foreach (var c in cerrados)
            await notificador.ComandoActualizadoAsync(c.AlimentadorId, c.ADto(), ct);
    }

    public async Task DetectarAnomaliasAsync(CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow();
        var ultimoHeartbeatValido = ahora - Constantes.ToleranciaHeartbeat;

        // RF-26: sin datos al día no se puede saber si comió. Se espera a que la Pi reporte
        // y a que termine de vaciar su cola; las visitas atrasadas traen su hora real.
        var mascotas = await db.Mascotas.Include(m => m.Alimentador).ThenInclude(a => a.Gateway)
            .Where(m => m.Activa && m.Alimentador.Gateway != null
                        && m.Alimentador.Gateway.SinConexionDesde == null
                        && m.Alimentador.Gateway.SincronizandoDesde == null
                        && m.Alimentador.Gateway.UltimoHeartbeat >= ultimoHeartbeatValido)
            .ToListAsync(ct);

        foreach (var m in mascotas)
        {
            await RevisarNoHaComidoAsync(m, ahora, ct);
            await RevisarBajaApetitoAsync(m, ahora, ct);
        }
    }

    public async Task AjustarRacionesAsync(CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow();
        var mascotas = await db.Mascotas.Include(m => m.Alimentador).ThenInclude(a => a.Gateway)
            .Where(m => m.Activa)
            .ToListAsync(ct);

        foreach (var m in mascotas)
        {
            var zona = m.Alimentador.ZonaHoraria;
            var hoy = CalendarioLocal.DiaDe(ahora, zona);
            var ultimoDia = hoy.AddDays(-1);
            if (await db.AjustesRacion.AnyAsync(a => a.MascotaId == m.Id && a.Dia == ultimoDia, ct))
                continue;

            var finVentana = CalendarioLocal.InicioDe(hoy, zona);
            var inicioVentana = CalendarioLocal.InicioDe(hoy.AddDays(-3), zona);

            // Solo días con datos completos: la Pi debe haber reportado después de que terminó la ventana
            var gateway = m.Alimentador.Gateway;
            if (gateway is null || gateway.SinConexionDesde is not null || gateway.SincronizandoDesde is not null
                || gateway.UltimoHeartbeat is null || gateway.UltimoHeartbeat < finVentana)
                continue;

            var visitas = await db.Visitas.AsNoTracking()
                .Where(v => v.MascotaId == m.Id && v.IniciadaEn >= inicioVentana && v.IniciadaEn < finVentana)
                .Select(v => new { v.IniciadaEn, v.DispensadoG, v.ConsumidoG })
                .ToListAsync(ct);

            var dias = Enumerable.Range(1, 3)
                .Select(i => hoy.AddDays(-i))
                .Select(d =>
                {
                    var delDia = visitas.Where(v => CalendarioLocal.DiaDe(v.IniciadaEn, zona) == d).ToList();
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

    /// <summary>Por si la Pi se reinicia a media sincronización y nunca avisa que terminó.</summary>
    private async Task CerrarSincronizacionesVencidasAsync(DateTimeOffset ahora, CancellationToken ct)
    {
        var limite = ahora - Constantes.LimiteSincronizacion;
        var vencidas = await db.Gateways.Include(g => g.Alimentadores)
            .Where(g => g.SincronizandoDesde != null && g.SincronizandoDesde < limite)
            .ToListAsync(ct);

        var avisos = new List<(int alimentadorId, int visitas)>();
        foreach (var g in vencidas)
        {
            var (avisar, visitas) = g.TerminarSincronizacion();
            if (avisar) avisos.AddRange(g.Alimentadores.Select(a => (a.Id, visitas)));
        }
        await db.SaveChangesAsync(ct);

        foreach (var (alimentadorId, visitas) in avisos)
            await alertas.CrearAsync(alimentadorId, null, TipoAlerta.ConexionRestablecida,
                Mapeos.MensajeConexionRestablecida(visitas), ahora, ct);
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
        var zona = m.Alimentador.ZonaHoraria;
        var hoy = CalendarioLocal.DiaDe(ahora, zona);
        var inicioHoy = CalendarioLocal.InicioDe(hoy, zona);
        var inicioAyer = CalendarioLocal.InicioDe(hoy.AddDays(-1), zona);
        var inicioVentana = CalendarioLocal.InicioDe(hoy.AddDays(-8), zona);

        if (await db.Alertas.AnyAsync(a => a.MascotaId == m.Id && a.Tipo == TipoAlerta.BajaApetito
                                           && a.OcurridaEn >= inicioHoy, ct))
            return;

        var visitas = await db.Visitas.AsNoTracking()
            .Where(v => v.MascotaId == m.Id && v.IniciadaEn >= inicioVentana && v.IniciadaEn < inicioHoy)
            .Select(v => new { v.IniciadaEn, v.ConsumidoG })
            .ToListAsync(ct);
        if (visitas.Count == 0) return;

        double consumoAyer = visitas.Where(v => v.IniciadaEn >= inicioAyer).Sum(v => v.ConsumidoG);
        double promedio7 = visitas.Where(v => v.IniciadaEn < inicioAyer).Sum(v => v.ConsumidoG) / 7;
        if (promedio7 <= 0 || consumoAyer >= promedio7 * Constantes.UmbralBajaApetito) return;

        await alertas.CrearAsync(m.AlimentadorId, m.Id, TipoAlerta.BajaApetito,
            $"{m.Nombre} comió ayer {consumoAyer:0} g, menos del 70 % de su promedio ({promedio7:0} g).", ahora, ct);
    }
}
