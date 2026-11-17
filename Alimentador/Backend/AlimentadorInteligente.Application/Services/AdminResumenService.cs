using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AdminResumenService(IAppDbContext db) : IAdminResumenService
{
    public async Task<ResumenAdminDto> ObtenerAsync(CancellationToken ct = default)
    {
        var ahora = DateTimeOffset.UtcNow;
        var hace7Dias = ahora.AddDays(-7);
        var hace24Horas = ahora.AddHours(-24);
        var limiteHeartbeat = Mapeos.LimiteHeartbeat(ahora);

        // Consultas secuenciales: el DbContext no admite operaciones en paralelo
        var usuarios = new ResumenUsuariosDto(
            await db.Usuarios.CountAsync(ct),
            await db.Usuarios.CountAsync(u => u.Activo, ct),
            await db.Usuarios.CountAsync(u => u.EsAdministrador && u.Activo, ct),
            await db.Usuarios.CountAsync(u => u.CreadoEn >= hace7Dias, ct));

        int totalAlimentadores = await db.Alimentadores.CountAsync(ct);
        int alimentadoresEnLinea = await db.Alimentadores.CountAsync(a => a.EnLinea, ct);
        var alimentadores = new ResumenAlimentadoresDto(
            totalAlimentadores, alimentadoresEnLinea, totalAlimentadores - alimentadoresEnLinea,
            await db.Alimentadores.CountAsync(a => a.GatewayId == null, ct));

        int totalGateways = await db.Gateways.CountAsync(ct);
        int gatewaysEnLinea = await db.Gateways.CountAsync(
            g => g.SinConexionDesde == null && g.UltimoHeartbeat != null && g.UltimoHeartbeat > limiteHeartbeat, ct);
        var gateways = new ResumenGatewaysDto(
            totalGateways, gatewaysEnLinea, totalGateways - gatewaysEnLinea,
            await db.Gateways.CountAsync(g => g.SincronizandoDesde != null, ct));

        var mascotas = new ResumenMascotasDto(
            await db.Mascotas.CountAsync(m => m.Activa, ct),
            await db.Mascotas.CountAsync(m => m.Activa && m.Especie == Especie.Perro, ct),
            await db.Mascotas.CountAsync(m => m.Activa && m.Especie == Especie.Gato, ct));

        int alertas24h = await db.Alertas.CountAsync(a => a.OcurridaEn >= hace24Horas, ct);

        var ota = new ResumenOtaDto(
            await db.ArtefactosOta.CountAsync(ct),
            await db.Comandos.CountAsync(c => c.Tipo == TipoComando.Ota
                && (c.Estado == EstadoComando.Pendiente || c.Estado == EstadoComando.Entregado), ct),
            await db.Comandos.CountAsync(c => c.Tipo == TipoComando.Ota && c.Estado == EstadoComando.Fallido
                && c.Error != Comando.ErrorCancelado && (c.CompletadoEn ?? c.CreadoEn) >= hace7Dias, ct));

        int fotosPorRevisar = await db.FotosDudosas.CountAsync(f => f.Subida && f.ClaseRevisada == null, ct);

        var firmware = await db.Alimentadores.AsNoTracking()
            .GroupBy(a => a.VersionFirmware)
            .Select(g => new VersionConteoDto(g.Key, g.Count()))
            .ToListAsync(ct);
        var modelo = await db.Alimentadores.AsNoTracking()
            .GroupBy(a => a.VersionModelo)
            .Select(g => new VersionConteoDto(g.Key, g.Count()))
            .ToListAsync(ct);

        return new ResumenAdminDto(
            usuarios, alimentadores, gateways, mascotas, alertas24h, ota, fotosPorRevisar,
            OrdenarVersiones(firmware), OrdenarVersiones(modelo));
    }

    /// <summary>Las versiones más usadas primero; las de alimentadores que nunca reportaron, al final.</summary>
    private static List<VersionConteoDto> OrdenarVersiones(List<VersionConteoDto> versiones)
        => versiones
            .OrderBy(v => v.Version is null)
            .ThenByDescending(v => v.Alimentadores)
            .ThenBy(v => v.Version, StringComparer.Ordinal)
            .ToList();
}
