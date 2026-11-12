using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using AlimentadorInteligente.Domain.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AlimentadorInteligente.Application.Services;

public class DispositivoService(
    IAppDbContext db,
    IAlertaService alertas,
    INotificadorTiempoReal notificador,
    IAlmacenamientoArchivos archivos,
    ILogger<DispositivoService> logger) : IDispositivoService
{
    public async Task<ConfiguracionDispositivoDto?> ObtenerConfiguracionAsync(int gatewayId, int version, CancellationToken ct = default)
    {
        var alimentadores = await db.Alimentadores.AsNoTracking()
            .Where(a => a.GatewayId == gatewayId)
            .Include(a => a.Mascotas.Where(m => m.Activa))
            .Include(a => a.Horarios)
            .ToListAsync(ct);

        if (alimentadores.All(a => a.VersionConfiguracion <= version))
            return null;

        return new ConfiguracionDispositivoDto(alimentadores.Select(a => new ConfigAlimentadorDto(
            a.Codigo,
            a.VersionConfiguracion,
            a.IntervaloMinimoHoras,
            a.ZonaHoraria,
            a.Mascotas.Select(m => new ConfigMascotaDto(
                m.Id, m.Nombre, NombreEspecie(m.Especie), m.Tolva, m.EtiquetaRfid,
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

        gateway.UltimoHeartbeat = ahora;
        gateway.SinConexionDesde = null;

        // RF-26: mientras llega la cola atrasada no se evalúan anomalías; el aviso de
        // "conexión restablecida" se manda al terminar, cuando ya se sabe cuántas visitas llegaron.
        bool volvio = request.OfflineSince is not null || gateway.AlertaSinConexionEnviada;
        if (volvio && gateway.SincronizandoDesde is null)
        {
            gateway.SincronizandoDesde = ahora;
            gateway.VisitasSincronizadas = 0;
        }

        var porCodigo = gateway.Alimentadores.ToDictionary(a => a.Codigo);
        foreach (var estado in request.Feeders)
        {
            if (!porCodigo.TryGetValue(estado.FeederId, out var a)) continue;
            var reportadoEn = DateTimeOffset.FromUnixTimeSeconds(estado.ReportedAt);
            if (a.UltimoEstado is not null && reportadoEn <= a.UltimoEstado) continue;

            a.EnLinea = estado.Online;
            a.NivelTolvaPerroPorcentaje = estado.HopperDogPct;
            a.NivelTolvaGatoPorcentaje = estado.HopperCatPct;
            a.PesoPlatoPerroG = estado.PlateDogG;
            a.PesoPlatoGatoG = estado.PlateCatG;
            a.VersionFirmware = estado.Firmware ?? a.VersionFirmware;
            a.VersionModelo = estado.Model ?? a.VersionModelo;
            a.UltimoEstado = reportadoEn;
            if (estado.Online) a.AlertaSinConexionEnviada = false;
        }
        await db.SaveChangesAsync(ct);

        foreach (var a in gateway.Alimentadores)
            await notificador.EstadoAlimentadorAsync(a.Id, a.Estado(), ct);
        return new HeartbeatResponse(ahora.ToUnixTimeSeconds());
    }

    public async Task TerminarSincronizacionAsync(int gatewayId, CancellationToken ct = default)
    {
        var gateway = await db.Gateways.Include(g => g.Alimentadores)
            .FirstAsync(g => g.Id == gatewayId, ct);
        var (avisar, visitas) = gateway.TerminarSincronizacion();
        await db.SaveChangesAsync(ct);

        if (!avisar) return;
        foreach (var a in gateway.Alimentadores)
            await alertas.CrearAsync(a.Id, null, TipoAlerta.ConexionRestablecida,
                Mapeos.MensajeConexionRestablecida(visitas), DateTimeOffset.UtcNow, ct);
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
        int rechazadas = 0;
        foreach (var v in visitas.OrderBy(v => v.StartedAt))
        {
            // Un registro malo no debe rechazar el lote: la Pi lo reintentaría para siempre
            if (!alimentadores.TryGetValue(v.FeederId, out var alimentador) || !EventIdValido(v.EventId)
                || !TryParsearClase(v.Class, out var clase))
            {
                rechazadas++;
                logger.LogWarning("Visita rechazada: alimentador {Alimentador}, evento {Evento}, clase {Clase}",
                    v.FeederId, v.EventId, v.Class);
                continue;
            }
            if (!vistos.Add((alimentador.Id, v.EventId))) continue;

            int? mascotaId = mascotas.Any(m => m.Id == v.PetId && m.AlimentadorId == alimentador.Id) ? v.PetId : null;
            nuevas.Add(new Visita
            {
                EventId = v.EventId,
                AlimentadorId = alimentador.Id,
                MascotaId = mascotaId,
                Clase = clase,
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
        var gateway = await db.Gateways.FirstAsync(g => g.Id == gatewayId, ct);
        if (gateway.SincronizandoDesde is not null)
            gateway.VisitasSincronizadas += nuevas.Count;
        await db.SaveChangesAsync(ct);

        foreach (var visita in nuevas)
            await notificador.VisitaRegistradaAsync(visita.AlimentadorId, visita.ADto(), ct);

        return new LoteResponse(nuevas.Count, visitas.Count - nuevas.Count - rechazadas, rechazadas);
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
        int rechazados = 0;
        foreach (var e in eventos.OrderBy(e => e.OccurredAt))
        {
            if (!alimentadores.TryGetValue(e.FeederId, out var alimentador) || !EventIdValido(e.EventId)
                || !TryParsearEvento(e.Type, out var tipo))
            {
                rechazados++;
                logger.LogWarning("Evento rechazado: alimentador {Alimentador}, evento {Evento}, tipo {Tipo}",
                    e.FeederId, e.EventId, e.Type);
                continue;
            }
            if (!vistos.Add((alimentador.Id, e.EventId))) continue;

            nuevos.Add(new EventoAlimentador
            {
                EventId = e.EventId,
                AlimentadorId = alimentador.Id,
                Tipo = tipo,
                Tolva = e.Hopper is Mascota.TolvaPerro or Mascota.TolvaGato ? e.Hopper : null,
                OcurridoEn = DateTimeOffset.FromUnixTimeSeconds(e.OccurredAt),
                Detalle = e.Detail is { Length: > 500 } ? e.Detail[..500] : e.Detail
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
                        $"El dispensador{DeTolva(evento.Tolva)} está atascado. Revisa la tolva y la paleta.", evento.OcurridoEn, ct);
                    break;
                case TipoEvento.HopperLow:
                    await alertas.CrearAsync(evento.AlimentadorId, null, TipoAlerta.TolvaBaja,
                        $"La tolva{DeTolva(evento.Tolva)} tiene menos del 20 % de alimento.", evento.OcurridoEn, ct);
                    break;
            }
        }
        return new LoteResponse(nuevos.Count, eventos.Count - nuevos.Count - rechazados, rechazados);
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
            string? target = c.ArtefactoOta is null ? null
                : c.ArtefactoOta.Tipo == TipoArtefactoOta.Firmware ? "firmware" : "model";
            entregar.Add(new ComandoDispositivoDto(
                c.Id, c.Alimentador.Codigo, c.Tipo == TipoComando.Dispensar ? "dispense" : "ota",
                c.Gramos, c.MascotaId, c.Tolva, url, c.ArtefactoOta?.Sha256, target, c.ArtefactoOta?.Version));
        }
        await db.SaveChangesAsync(ct);

        foreach (var c in pendientes)
            await notificador.ComandoActualizadoAsync(c.AlimentadorId, c.ADto(), ct);

        return entregar;
    }

    public async Task ReportarResultadoAsync(int gatewayId, int comandoId, ResultadoComandoRequest request, CancellationToken ct = default)
    {
        var comando = await db.Comandos
            .Include(c => c.Alimentador).ThenInclude(a => a.Gateway)
            .Include(c => c.ArtefactoOta)
            .FirstOrDefaultAsync(c => c.Id == comandoId && c.Alimentador.GatewayId == gatewayId, ct)
            ?? throw new NoEncontradoException("Comando", comandoId);

        // Resultado repetido por reintento de la Pi. Si se cerró solo por falta de respuesta,
        // el resultado real que llega tarde (cola offline de la Pi) sí se aplica.
        if ((comando.Estado is EstadoComando.Completado or EstadoComando.Fallido or EstadoComando.Vencido)
            && !comando.CerradoSinRespuesta)
            return;

        comando.CompletadoEn = DateTimeOffset.UtcNow;
        comando.DispensadoG = request.DispensedG;
        comando.Error = request.Error is { Length: > 300 } ? request.Error[..300] : request.Error;
        comando.Estado = request.Ok ? EstadoComando.Completado
            : request.Error == "expired" ? EstadoComando.Vencido
            : EstadoComando.Fallido;

        // La versión instalada se refleja de inmediato; el siguiente heartbeat la confirma
        bool otaInstalada = request.Ok && comando.Tipo == TipoComando.Ota && comando.ArtefactoOta is not null;
        if (otaInstalada)
        {
            if (comando.ArtefactoOta!.Tipo == TipoArtefactoOta.Firmware)
                comando.Alimentador.VersionFirmware = comando.ArtefactoOta.Version;
            else
                comando.Alimentador.VersionModelo = comando.ArtefactoOta.Version;
        }
        await db.SaveChangesAsync(ct);

        await notificador.ComandoActualizadoAsync(comando.AlimentadorId, comando.ADto(), ct);
        if (otaInstalada)
            await notificador.EstadoAlimentadorAsync(comando.AlimentadorId, comando.Alimentador.Estado(), ct);
    }

    public async Task<SolicitudFotoResponse> SolicitarSubidaFotoAsync(int gatewayId, SolicitudFotoRequest request, CancellationToken ct = default)
    {
        var alimentadores = await AlimentadoresDeAsync(gatewayId, ct);
        var alimentador = alimentadores.GetValueOrDefault(request.FeederId)
            ?? throw new ProhibidoException($"El alimentador '{request.FeederId}' no pertenece a este gateway.");
        if (!EventIdValido(request.EventId) || !TryParsearClase(request.Class, out var clase))
            throw new ReglaNegocioException("La foto no tiene un evento o una clase válidos.");

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
                ClasePredicha = clase,
                Confianza = request.Confidence,
                TomadaEn = tomadaEn
            };
            db.FotosDudosas.Add(foto);
            await db.SaveChangesAsync(ct);
        }

        var url = archivos.GenerarUrlSubida(Constantes.ContenedorFotos, foto.BlobNombre, TimeSpan.FromMinutes(15));
        return new SolicitudFotoResponse(url.ToString(), foto.BlobNombre);
    }

    public async Task ConfirmarFotoAsync(int gatewayId, ConfirmarFotoRequest request, CancellationToken ct = default)
    {
        var foto = await db.FotosDudosas.FirstOrDefaultAsync(f => f.EventId == request.EventId
                && f.Alimentador.Codigo == request.FeederId && f.Alimentador.GatewayId == gatewayId, ct)
            ?? throw new NoEncontradoException("Foto", request.EventId);
        foto.Subida = true;
        await db.SaveChangesAsync(ct);
    }

    private async Task<Dictionary<string, Alimentador>> AlimentadoresDeAsync(int gatewayId, CancellationToken ct)
        => await db.Alimentadores.AsNoTracking()
            .Where(a => a.GatewayId == gatewayId)
            .ToDictionaryAsync(a => a.Codigo, ct);

    private static string NombreEspecie(Especie e) => e == Especie.Perro ? "perro" : "gato";

    private static bool EventIdValido(string eventId) => !string.IsNullOrWhiteSpace(eventId) && eventId.Length <= 64;

    private static string DeTolva(int? tolva) => tolva switch
    {
        Mascota.TolvaPerro => " del perro",
        Mascota.TolvaGato => " del gato",
        _ => string.Empty
    };

    private static bool TryParsearClase(string clase, out ClaseDetectada resultado)
    {
        ClaseDetectada? valor = clase.ToLowerInvariant() switch
        {
            "perro" => ClaseDetectada.Perro,
            "gato" => ClaseDetectada.Gato,
            "paloma" => ClaseDetectada.Paloma,
            "nada" => ClaseDetectada.Nada,
            _ => null
        };
        resultado = valor.GetValueOrDefault();
        return valor is not null;
    }

    private static bool TryParsearEvento(string tipo, out TipoEvento resultado)
    {
        TipoEvento? valor = tipo.ToUpperInvariant() switch
        {
            "JAM" => TipoEvento.Jam,
            "HOPPER_LOW" => TipoEvento.HopperLow,
            _ => null
        };
        resultado = valor.GetValueOrDefault();
        return valor is not null;
    }
}
