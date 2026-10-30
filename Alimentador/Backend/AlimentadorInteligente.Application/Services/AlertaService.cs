using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AlertaService(
    IAppDbContext db, IAccesoAlimentador acceso, INotificadorTiempoReal notificador, IPushService push) : IAlertaService
{
    public async Task<IReadOnlyList<AlertaDto>> ListarAsync(int alimentadorId, bool soloNoLeidas, CancellationToken ct = default)
    {
        await acceso.RequerirAccesoAsync(alimentadorId, ct);
        var query = db.Alertas.AsNoTracking().Where(a => a.AlimentadorId == alimentadorId);
        if (soloNoLeidas) query = query.Where(a => !a.Leida);
        var alertas = await query.OrderByDescending(a => a.OcurridaEn).Take(200).ToListAsync(ct);
        return alertas.Select(a => a.ADto()).ToList();
    }

    public async Task MarcarLeidaAsync(int id, CancellationToken ct = default)
    {
        var alerta = await db.Alertas.FindAsync([id], ct) ?? throw new NoEncontradoException("Alerta", id);
        await acceso.RequerirAccesoAsync(alerta.AlimentadorId, ct);
        alerta.Leida = true;
        await db.SaveChangesAsync(ct);
    }

    public async Task CrearAsync(
        int alimentadorId, int? mascotaId, TipoAlerta tipo, string mensaje, DateTimeOffset ocurridaEn, CancellationToken ct = default)
    {
        var alerta = new Alerta
        {
            AlimentadorId = alimentadorId,
            MascotaId = mascotaId,
            Tipo = tipo,
            Mensaje = mensaje,
            OcurridaEn = ocurridaEn
        };
        db.Alertas.Add(alerta);
        await db.SaveChangesAsync(ct);

        await notificador.AlertaCreadaAsync(alimentadorId, alerta.ADto(), ct);

        var tokens = await db.MiembrosAlimentador.AsNoTracking()
            .Where(m => m.AlimentadorId == alimentadorId && m.Usuario.ExpoPushToken != null)
            .Select(m => m.Usuario.ExpoPushToken!)
            .ToListAsync(ct);

        // Las alertas que llegan atrasadas se marcan con la hora en que ocurrieron (sección 8.3)
        var cuerpo = DateTimeOffset.UtcNow - ocurridaEn > TimeSpan.FromMinutes(5)
            ? $"{mensaje} (ocurrió a las {ocurridaEn:HH:mm})"
            : mensaje;
        await push.EnviarAsync(tokens, TituloDe(tipo), cuerpo, ct);
    }

    private static string TituloDe(TipoAlerta tipo) => tipo switch
    {
        TipoAlerta.NoHaComido => "Tu mascota no ha comido",
        TipoAlerta.BajaApetito => "Baja de apetito",
        TipoAlerta.Atasco => "Dispensador atascado",
        TipoAlerta.TolvaBaja => "Queda poco alimento",
        TipoAlerta.AlimentadorSinConexion => "Alimentador sin conexión",
        TipoAlerta.GatewaySinConexion => "Raspberry Pi sin conexión",
        TipoAlerta.ConexionRestablecida => "Conexión restablecida",
        TipoAlerta.PalomasFrecuentes => "Palomas frecuentes",
        _ => "Alimentador"
    };
}
