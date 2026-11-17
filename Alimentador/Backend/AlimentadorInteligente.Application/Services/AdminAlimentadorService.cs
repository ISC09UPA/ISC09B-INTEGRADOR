using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using AlimentadorInteligente.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AdminAlimentadorService(IAppDbContext db) : IAdminAlimentadorService
{
    private const int MaxRecientes = 20;

    public async Task<Pagina<AlimentadorAdminDto>> ListarAsync(ConsultaAlimentadores consulta, CancellationToken ct = default)
    {
        var alimentadores = db.Alimentadores.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(consulta.Buscar))
        {
            var buscar = consulta.Buscar.Trim().ToLowerInvariant();
            alimentadores = alimentadores.Where(a =>
                a.Codigo.ToLower().Contains(buscar)
                || a.Nombre.ToLower().Contains(buscar)
                || a.Miembros.Any(m => m.Rol == RolAlimentador.Dueno && m.Usuario.Email.ToLower().Contains(buscar)));
        }

        alimentadores = consulta.Estado?.Trim().ToLowerInvariant() switch
        {
            "enlinea" => alimentadores.Where(a => a.EnLinea),
            "sinconexion" => alimentadores.Where(a => !a.EnLinea),
            "singateway" => alimentadores.Where(a => a.GatewayId == null),
            _ => alimentadores
        };

        return await Proyectar(alimentadores.OrderByDescending(a => a.CreadoEn).ThenByDescending(a => a.Id))
            .PaginarAsync(consulta, ADto, ct);
    }

    public async Task<AlimentadorAdminDetalleDto> ObtenerAsync(int id, CancellationToken ct = default)
    {
        var fila = await Proyectar(db.Alimentadores.AsNoTracking().Where(a => a.Id == id)).FirstOrDefaultAsync(ct)
            ?? throw new NoEncontradoException("Alimentador", id);
        var resumen = ADto(fila);
        var alimentador = fila.Alimentador;

        var miembros = await db.MiembrosAlimentador.AsNoTracking()
            .Where(m => m.AlimentadorId == id)
            .OrderBy(m => m.UsuarioId)
            .Select(m => new MiembroDto(m.UsuarioId, m.Usuario.Nombre, m.Usuario.Email, m.Rol))
            .ToListAsync(ct);

        // Incluye las dadas de baja para que el panel muestre el historial completo
        var mascotas = await db.Mascotas.AsNoTracking()
            .Where(m => m.AlimentadorId == id)
            .OrderByDescending(m => m.Activa).ThenBy(m => m.Id)
            .ToListAsync(ct);
        var ultimasVisitas = await db.Visitas.AsNoTracking()
            .Where(v => v.AlimentadorId == id && v.MascotaId != null)
            .GroupBy(v => v.MascotaId)
            .Select(g => new { MascotaId = g.Key, Ultima = g.Max(v => v.IniciadaEn) })
            .ToDictionaryAsync(x => x.MascotaId!.Value, x => (DateTimeOffset?)x.Ultima, ct);

        var horarios = await db.Horarios.AsNoTracking()
            .Where(h => h.AlimentadorId == id)
            .OrderBy(h => h.Hora).ThenBy(h => h.Id)
            .ToListAsync(ct);

        var comandos = await db.Comandos.AsNoTracking()
            .Where(c => c.AlimentadorId == id)
            .OrderByDescending(c => c.CreadoEn).ThenByDescending(c => c.Id)
            .Take(MaxRecientes)
            .Select(Mapeos.ComandoAdmin)
            .ToListAsync(ct);

        var alertas = await db.Alertas.AsNoTracking()
            .Where(x => x.AlimentadorId == id)
            .OrderByDescending(x => x.CreadoEn).ThenByDescending(x => x.Id)
            .Take(MaxRecientes)
            .Select(x => new AlertaDto(x.Id, x.AlimentadorId, x.MascotaId, x.Tipo, x.Mensaje, x.OcurridaEn, x.CreadoEn, x.Leida))
            .ToListAsync(ct);

        return new AlimentadorAdminDetalleDto(
            resumen.Id, resumen.Codigo, resumen.Nombre, resumen.ZonaHoraria, resumen.Dueno,
            resumen.Miembros, resumen.Mascotas, resumen.Gateway, resumen.Estado,
            resumen.VersionConfiguracion, resumen.CreadoEn,
            alimentador.KcalPorGramo, alimentador.IntervaloMinimoHoras,
            miembros,
            mascotas.Select(m => new MascotaAdminDto(
                m.Id, m.Nombre, m.Especie, m.Tolva, m.PesoKg, m.EdadMeses, m.ComidasPorDia, m.EtiquetaRfid,
                m.AjustePorcentaje, Math.Round(CalculadoraRacion.GramosPorDia(m, alimentador.KcalPorGramo), 1),
                m.Activa, ultimasVisitas.GetValueOrDefault(m.Id))).ToList(),
            horarios.Select(h => new HorarioAdminDto(h.Id, h.Hora.ToString("HH:mm"), h.MascotaId, h.Activo)).ToList(),
            comandos,
            alertas);
    }

    /// <summary>Fila intermedia: el estado y la conexión de la Pi se calculan en memoria con Mapeos.Estado.</summary>
    private sealed record FilaAlimentador(
        Alimentador Alimentador, Gateway? Gateway, UsuarioResumenDto? Dueno, int Miembros, int Mascotas);

    /// <summary>Con varios dueños se muestra el de menor id.</summary>
    private static IQueryable<FilaAlimentador> Proyectar(IQueryable<Alimentador> alimentadores)
        => alimentadores.Select(a => new FilaAlimentador(
            a,
            a.Gateway,
            a.Miembros
                .Where(m => m.Rol == RolAlimentador.Dueno)
                .OrderBy(m => m.UsuarioId)
                .Select(m => new UsuarioResumenDto(m.Usuario.Id, m.Usuario.Nombre, m.Usuario.Email))
                .FirstOrDefault(),
            a.Miembros.Count(),
            a.Mascotas.Count(m => m.Activa)));

    private static AlimentadorAdminDto ADto(FilaAlimentador f)
    {
        var a = f.Alimentador;
        var estado = a.Estado(f.Gateway);
        var gateway = f.Gateway is null ? null : new GatewayResumenDto(f.Gateway.Id, f.Gateway.DeviceId, estado.GatewayEnLinea);
        return new AlimentadorAdminDto(
            a.Id, a.Codigo, a.Nombre, a.ZonaHoraria, f.Dueno, f.Miembros, f.Mascotas, gateway, estado,
            a.VersionConfiguracion, a.CreadoEn);
    }
}
