using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AdminUsuarioService(IAppDbContext db, IUsuarioActual usuario) : IAdminUsuarioService
{
    public async Task<Pagina<UsuarioAdminDto>> ListarAsync(ConsultaUsuarios consulta, CancellationToken ct = default)
    {
        var usuarios = db.Usuarios.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(consulta.Buscar))
        {
            var buscar = consulta.Buscar.Trim().ToLowerInvariant();
            usuarios = usuarios.Where(u => u.Nombre.ToLower().Contains(buscar) || u.Email.ToLower().Contains(buscar));
        }

        return await Proyectar(usuarios.OrderByDescending(u => u.CreadoEn).ThenByDescending(u => u.Id))
            .PaginarAsync(consulta, ct);
    }

    public async Task<UsuarioAdminDetalleDto> ObtenerAsync(int id, CancellationToken ct = default)
    {
        var u = await BuscarDtoAsync(id, ct);

        var membresias = await db.MiembrosAlimentador.AsNoTracking()
            .Where(m => m.UsuarioId == id)
            .OrderBy(m => m.Alimentador.Codigo)
            .Select(m => new MembresiaAdminDto(m.AlimentadorId, m.Alimentador.Codigo, m.Alimentador.Nombre, m.Rol))
            .ToListAsync(ct);

        var limiteHeartbeat = Mapeos.LimiteHeartbeat(DateTimeOffset.UtcNow);
        var gateways = await db.Gateways.AsNoTracking()
            .Where(g => g.PropietarioId == id)
            .OrderBy(g => g.DeviceId)
            .Select(g => new GatewayResumenDto(g.Id, g.DeviceId,
                g.SinConexionDesde == null && g.UltimoHeartbeat != null && g.UltimoHeartbeat > limiteHeartbeat))
            .ToListAsync(ct);

        return new UsuarioAdminDetalleDto(
            u.Id, u.Nombre, u.Email, u.EsAdministrador, u.Activo, u.CreadoEn, u.UltimoAcceso,
            u.Alimentadores, u.Gateways, membresias, gateways);
    }

    public async Task<UsuarioAdminDto> CambiarAdministradorAsync(int id, CambiarAdministradorRequest request, CancellationToken ct = default)
    {
        var objetivo = await BuscarAsync(id, ct);
        if (objetivo.EsAdministrador && !request.EsAdministrador)
        {
            if (id == usuario.Id)
                throw new ReglaNegocioException("No puedes quitarte tu propio rol de administrador.");
            if (objetivo.Activo)
                await AsegurarOtroAdministradorActivoAsync(id, "No se puede quitar el rol al último administrador activo.", ct);
        }

        objetivo.EsAdministrador = request.EsAdministrador;
        await db.SaveChangesAsync(ct);
        return await BuscarDtoAsync(id, ct);
    }

    public async Task<UsuarioAdminDto> CambiarActivoAsync(int id, CambiarActivoRequest request, CancellationToken ct = default)
    {
        var objetivo = await BuscarAsync(id, ct);
        if (objetivo.Activo && !request.Activo)
        {
            if (id == usuario.Id)
                throw new ReglaNegocioException("No puedes desactivar tu propia cuenta.");
            if (objetivo.EsAdministrador)
                await AsegurarOtroAdministradorActivoAsync(id, "No se puede desactivar al último administrador activo.", ct);

            // Sin refresh tokens vigentes la sesión termina cuando venza el access token (15 min)
            var ahora = DateTimeOffset.UtcNow;
            var tokens = await db.RefreshTokens
                .Where(r => r.UsuarioId == id && r.RevocadoEn == null)
                .ToListAsync(ct);
            foreach (var token in tokens)
                token.RevocadoEn = ahora;
        }

        objetivo.Activo = request.Activo;
        await db.SaveChangesAsync(ct);
        return await BuscarDtoAsync(id, ct);
    }

    private async Task<Usuario> BuscarAsync(int id, CancellationToken ct)
        => await db.Usuarios.FirstOrDefaultAsync(u => u.Id == id, ct)
           ?? throw new NoEncontradoException("Usuario", id);

    private async Task<UsuarioAdminDto> BuscarDtoAsync(int id, CancellationToken ct)
        => await Proyectar(db.Usuarios.AsNoTracking().Where(u => u.Id == id)).FirstOrDefaultAsync(ct)
           ?? throw new NoEncontradoException("Usuario", id);

    private async Task AsegurarOtroAdministradorActivoAsync(int id, string mensaje, CancellationToken ct)
    {
        bool hayOtro = await db.Usuarios.AnyAsync(u => u.Id != id && u.EsAdministrador && u.Activo, ct);
        if (!hayOtro)
            throw new ReglaNegocioException(mensaje);
    }

    private IQueryable<UsuarioAdminDto> Proyectar(IQueryable<Usuario> usuarios)
        => usuarios.Select(u => new UsuarioAdminDto(
            u.Id, u.Nombre, u.Email, u.EsAdministrador, u.Activo, u.CreadoEn, u.UltimoAcceso,
            u.Alimentadores.Count(),
            db.Gateways.Count(g => g.PropietarioId == u.Id)));
}
