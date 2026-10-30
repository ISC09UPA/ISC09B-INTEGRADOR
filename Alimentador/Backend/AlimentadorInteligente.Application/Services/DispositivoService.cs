using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using AlimentadorInteligente.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class DispositivoService(
    IAppDbContext db,
    IAlertaService alertas,
    INotificadorTiempoReal notificador,
    IAlmacenamientoArchivos archivos) : IDispositivoService
{
    public async Task<ConfiguracionDispositivoDto?> ObtenerConfiguracionAsync(int gatewayId, int version, CancellationToken ct = default)
    {
        var alimentadores = await db.Alimentadores.AsNoTracking()
            .Where(a => a.GatewayId == gatewayId)
            .Include(a => a.Mascotas)
            .Include(a => a.Horarios)
            .ToListAsync(ct);

        if (alimentadores.All(a => a.VersionConfiguracion <= version))
            return null;

        return new ConfiguracionDispositivoDto(alimentadores.Select(a => new ConfigAlimentadorDto(
            a.Codigo,
            a.VersionConfiguracion,
            a.IntervaloMinimoHoras,
            a.Mascotas.Select(m => new ConfigMascotaDto(
                m.Id, m.Nombre, NombreEspecie(m.Especie), m.EtiquetaRfid,
                Math.Round(CalculadoraRacion.GramosPorComida(m, a.KcalPorGramo), 1))).ToList(),
            a.Horarios.Where(h => h.Activo).OrderBy(h => h.Hora)
                .Select(h => new ConfigHorarioDto(h.MascotaId, h.Hora.ToString("HH:mm"))).ToList()
        )).ToList());
    }

    public async Task<HeartbeatResponse> HeartbeatAsync(int gatewayId, HeartbeatRequest request, CancellationToken ct = default)
    {
        var ahora = DateTimeOffset.UtcNow;
        var gateway = await db.Gateways.Include(g => g.Alimentadores)
            .FirstAsync(g => g.Id == gatewayId, ct);

        bool sePerdioConexion = gateway.AlertaSinConexionEnviada;
        gateway.UltimoHeartbeat = ahora;
        gateway.SinConexionDesde = null;
        gateway.AlertaSinConexionEnviada = false;

        var porCodigo = gateway.Alimentadores.ToDictionary(a => a.Codigo);
        foreach (var estado in request.Feeders)
        {
            if (!porCodigo.TryGetValue(estado.FeederId, out var a)) continue;
            var reportadoEn = DateTimeOffset.FromUnixTimeSeconds(estado.ReportedAt);
            if (a.UltimoEstado is not null && reportadoEn <= a.UltimoEstado) continue;

            a.EnLinea = estado.Online;
            a.NivelTolvaPorcentaje = estado.HopperPct;
            a.PesoPlatoG = estado.PlateG;
            a.VersionFirmware = estado.Firmware ?? a.VersionFirmware;
            a.VersionModelo = estado.Model ?? a.VersionModelo;
            a.UltimoEstado = reportadoEn;
            if (estado.Online) a.AlertaSinConexionEnviada = false;
        }
        await db.SaveChangesAsync(ct);

        foreach (var a in gateway.Alimentadores)
        {
            await notificador.EstadoAlimentadorAsync(a.Id, a.Estado(), ct);
            if (sePerdioConexion)
            {
                // TODO: incluir "se sincronizaron N visitas" cuando la Pi termine de vaciar su cola
                await alertas.CrearAsync(a.Id, null, TipoAlerta.ConexionRestablecida,
                    "La conexión se restableció; se están sincronizando los datos pendientes.", ahora, ct);
            }
        }
        return new HeartbeatResponse(ahora.ToUnixTimeSeconds());
    }

    public async Task<LoteResponse> RegistrarVisitasAsync(int gatewayId, IReadOnlyList<VisitaDispositivoDto> visitas, CancellationToken ct = default)
    {
        var alimentadores = await AlimentadoresDeAsync(gatewayId, ct);
        var ids = visitas.Select(v => v.EventId).Distinct().ToList();
        var idsAlimentador = alimentadores.Values.Select(a => a.Id).ToList();
        var existentes = await db.Visitas
            .Where(v => ids.Contains(v.EventId) && idsAlimentador.Contains(v.AlimentadorId))
            .Select(v => new { v.AlimentadorId, v.EventId })
            .ToListAsync(ct);
        var vistos = existentes.Select(e => (e.AlimentadorId, e.EventId)).ToHashSet();
        var mascotas = await db.Mascotas.AsNoTracking()
            .Where(m => idsAlimentador.Contains(m.AlimentadorId))
            .Select(m => new { m.Id, m.AlimentadorId })
            .ToListAsync(ct);

        var nuevas = new List<Visita>();
        foreach (var v in visitas.OrderBy(v => v.StartedAt))
        {
            var alimentador = alimentadores.GetValueOrDefault(v.FeederId)
                ?? throw new ProhibidoException($"El alimentador '{v.FeederId}' no pertenece a este gateway.");
            if (!vistos.Add((alimentador.Id, v.EventId))) continue;

            int? mascotaId = mascotas.Any(m => m.Id == v.PetId && m.AlimentadorId == alimentador.Id) ? v.PetId : null;
            nuevas.Add(new Visita
            {
                EventId = v.EventId,
                AlimentadorId = alimentador.Id,
                MascotaId = mascotaId,
                Clase = ParsearClase(v.Class),
                Confianza = v.Confidence,
                IniciadaEn = DateTimeOffset.FromUnixTimeSeconds(v.StartedAt),
                TerminadaEn = DateTimeOffset.FromUnixTimeSeconds(v.EndedAt),
                PlatoAntesG = v.PlateBeforeG,
                DispensadoG = v.DispensedG,
                PlatoDespuesG = v.PlateAfterG,
                ConsumidoG = Visita.CalcularConsumo(v.PlateBeforeG, v.DispensedG, v.PlateAfterG)
            });
        }

        db.Visitas.AddRange(nuevas);
        await db.SaveChangesAsync(ct);

        foreach (var visita in nuevas)
            await notificador.VisitaRegistradaAsync(visita.AlimentadorId, visita.ADto(), ct);

        return new LoteResponse(nuevas.Count, visitas.Count - nuevas.Count);
    }

    public async Task<LoteResponse> RegistrarEventosAsync(int gatewayId, IReadOnlyList<EventoDispositivoDto> eventos, CancellationToken ct = default)
    {
        var alimentadores = await AlimentadoresDeAsync(gatewayId, ct);
        var ids = eventos.Select(e => e.EventId).Distinct().ToList();
        var idsAlimentador = alimentadores.Values.Select(a => a.Id).ToList();
        var existentes = await db.Eventos
            .Where(e => ids.Contains(e.EventId) && idsAlimentador.Contains(e.AlimentadorId))
            .Select(e => new { e.AlimentadorId, e.EventId })
            .ToListAsync(ct);
        var vistos = existentes.Select(e => (e.AlimentadorId, e.EventId)).ToHashSet();

        var nuevos = new List<EventoAlimentador>();
        foreach (var e in eventos.OrderBy(e => e.OccurredAt))
        {
            var alimentador = alimentadores.GetValueOrDefault(e.FeederId)
                ?? throw new ProhibidoException($"El alimentador '{e.FeederId}' no pertenece a este gateway.");
            if (!vistos.Add((alimentador.Id, e.EventId))) continue;

            nuevos.Add(new EventoAlimentador
            {
                EventId = e.EventId,
                AlimentadorId = alimentador.Id,
                Tipo = ParsearEvento(e.Type),
                OcurridoEn = DateTimeOffset.FromUnixTimeSeconds(e.OccurredAt),
                Detalle = e.Detail
            });
        }

        db.Eventos.AddRange(nuevos);
        await db.SaveChangesAsync(ct);

        // Las alertas se crean con la hora real del evento (RF-26)
        foreach (var evento in nuevos)
        {
            switch (evento.Tipo)
            {
                case TipoEvento.Jam:
                    await alertas.CrearAsync(evento.AlimentadorId, null, TipoAlerta.Atasco,
                        "El dispensador está atascado. Revisa la tolva y el tornillo.", evento.OcurridoEn, ct);
                    break;
                case TipoEvento.HopperLow:
                    await alertas.CrearAsync(evento.AlimentadorId, null, TipoAlerta.TolvaBaja,
                        "La tolva tiene menos del 20 % de alimento.", evento.OcurridoEn, ct);
                    break;
            }
        }
        return new LoteResponse(nuevos.Count, eventos.Count - nuevos.Count);
    }

    public async Task<IReadOnlyList<ComandoDispositivoDto>> ObtenerComandosAsync(int gatewayId, CancellationToken ct = default)
    {
        var ahora = DateTimeOffset.UtcNow;
        var pendientes = await db.Comandos
            .Include(c => c.Alimentador)
            .Include(c => c.ArtefactoOta)
            .Where(c => c.Alimentador.GatewayId == gatewayId && c.Estado == EstadoComando.Pendiente)
            .OrderBy(c => c.CreadoEn)
            .ToListAsync(ct);

        var entregar = new List<ComandoDispositivoDto>();
        foreach (var c in pendientes)
        {
            if (c.EstaVencido(ahora))
            {
                // No se suelta comida horas después de pedirla (sección 8.3)
                c.Estado = EstadoComando.Vencido;
                continue;
            }

            c.Estado = EstadoComando.Entregado;
            c.EntregadoEn = ahora;
            string? url = c.ArtefactoOta is null ? null
                : archivos.GenerarUrlDescarga(Constantes.ContenedorOta, c.ArtefactoOta.BlobNombre, TimeSpan.FromHours(1)).ToString();
            entregar.Add(new ComandoDispositivoDto(
                c.Id, c.Alimentador.Codigo, c.Tipo == TipoComando.Dispensar ? "dispense" : "ota",
                c.Gramos, c.MascotaId, url, c.ArtefactoOta?.Sha256));
        }
        await db.SaveChangesAsync(ct);

        foreach (var c in pendientes)
            await notificador.ComandoActualizadoAsync(c.AlimentadorId, c.ADto(), ct);

        return entregar;
    }

    public async Task ReportarResultadoAsync(int gatewayId, int comandoId, ResultadoComandoRequest request, CancellationToken ct = default)
    {
        var comando = await db.Comandos.Include(c => c.Alimentador)
            .FirstOrDefaultAsync(c => c.Id == comandoId && c.Alimentador.GatewayId == gatewayId, ct)
            ?? throw new NoEncontradoException("Comando", comandoId);

        if (comando.Estado is EstadoComando.Completado or EstadoComando.Fallido or EstadoComando.Vencido)
            return; // resultado repetido por reintento de la Pi

        comando.CompletadoEn = DateTimeOffset.UtcNow;
        comando.DispensadoG = request.DispensedG;
        comando.Error = request.Error;
        comando.Estado = request.Ok ? EstadoComando.Completado
            : request.Error == "expired" ? EstadoComando.Vencido
            : EstadoComando.Fallido;
        await db.SaveChangesAsync(ct);

        await notificador.ComandoActualizadoAsync(comando.AlimentadorId, comando.ADto(), ct);
    }

    public async Task<SolicitudFotoResponse> SolicitarSubidaFotoAsync(int gatewayId, SolicitudFotoRequest request, CancellationToken ct = default)
    {
        var alimentadores = await AlimentadoresDeAsync(gatewayId, ct);
        var alimentador = alimentadores.GetValueOrDefault(request.FeederId)
            ?? throw new ProhibidoException($"El alimentador '{request.FeederId}' no pertenece a este gateway.");

        var foto = await db.FotosDudosas
            .FirstOrDefaultAsync(f => f.AlimentadorId == alimentador.Id && f.EventId == request.EventId, ct);
        if (foto is null)
        {
            var tomadaEn = DateTimeOffset.FromUnixTimeSeconds(request.TakenAt);
            foto = new FotoDudosa
            {
                EventId = request.EventId,
                AlimentadorId = alimentador.Id,
                BlobNombre = $"{alimentador.Codigo}/{tomadaEn:yyyy/MM/dd}/{request.EventId}.jpg",
                ClasePredicha = ParsearClase(request.Class),
                Confianza = request.Confidence,
                TomadaEn = tomadaEn
            };
            db.FotosDudosas.Add(foto);
            await db.SaveChangesAsync(ct);
        }

        // TODO: marcar Subida = true cuando Blob Storage confirme (Event Grid o endpoint de confirmación)
        var url = archivos.GenerarUrlSubida(Constantes.ContenedorFotos, foto.BlobNombre, TimeSpan.FromMinutes(15));
        return new SolicitudFotoResponse(url.ToString(), foto.BlobNombre);
    }

    private async Task<Dictionary<string, Alimentador>> AlimentadoresDeAsync(int gatewayId, CancellationToken ct)
        => await db.Alimentadores.AsNoTracking()
            .Where(a => a.GatewayId == gatewayId)
            .ToDictionaryAsync(a => a.Codigo, ct);

    private static string NombreEspecie(Especie e) => e == Especie.Perro ? "perro" : "gato";

    private static ClaseDetectada ParsearClase(string clase) => clase.ToLowerInvariant() switch
    {
        "perro" => ClaseDetectada.Perro,
        "gato" => ClaseDetectada.Gato,
        "paloma" => ClaseDetectada.Paloma,
        "nada" => ClaseDetectada.Nada,
        _ => throw new ReglaNegocioException($"Clase desconocida: '{clase}'.")
    };

    private static TipoEvento ParsearEvento(string tipo) => tipo.ToUpperInvariant() switch
    {
        "JAM" => TipoEvento.Jam,
        "HOPPER_LOW" => TipoEvento.HopperLow,
        "PIGEON" => TipoEvento.Pigeon,
        _ => throw new ReglaNegocioException($"Tipo de evento desconocido: '{tipo}'.")
    };
}
