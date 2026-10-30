using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AlimentadorService(IAppDbContext db, IUsuarioActual usuario, IAccesoAlimentador acceso) : IAlimentadorService
{
    public async Task<IReadOnlyList<AlimentadorDto>> ListarAsync(CancellationToken ct = default)
    {
        var miembros = await db.MiembrosAlimentador.AsNoTracking()
            .Where(m => m.UsuarioId == usuario.Id)
            .Include(m => m.Alimentador).ThenInclude(a => a.Gateway)
            .ToListAsync(ct);
        return miembros.Select(m => ADto(m.Alimentador, m.Rol)).ToList();
    }

    public async Task<AlimentadorDto> ObtenerAsync(int id, CancellationToken ct = default)
    {
        var rol = await acceso.RequerirAccesoAsync(id, ct);
        return ADto(await CargarAsync(id, ct), rol);
    }

    public async Task<AlimentadorDto> CrearAsync(CrearAlimentadorRequest request, CancellationToken ct = default)
    {
        if (await db.Alimentadores.AnyAsync(a => a.Codigo == request.Codigo, ct))
            throw new ConflictoException("Ese alimentador ya está registrado.");

        Gateway? gateway = null;
        if (!string.IsNullOrWhiteSpace(request.GatewayDeviceId))
        {
            gateway = await db.Gateways.FirstOrDefaultAsync(g => g.DeviceId == request.GatewayDeviceId, ct)
                ?? throw new NoEncontradoException("Gateway", request.GatewayDeviceId);
        }

        var alimentador = new Alimentador
        {
            Codigo = request.Codigo,
            Nombre = request.Nombre,
            KcalPorGramo = request.KcalPorGramo,
            Gateway = gateway
        };
        alimentador.Miembros.Add(new MiembroAlimentador { UsuarioId = usuario.Id, Rol = RolAlimentador.Dueno });
        db.Alimentadores.Add(alimentador);
        await db.SaveChangesAsync(ct);
        return ADto(alimentador, RolAlimentador.Dueno);
    }

    public async Task<AlimentadorDto> ActualizarAsync(int id, ActualizarAlimentadorRequest request, CancellationToken ct = default)
    {
        await acceso.RequerirDuenoAsync(id, ct);
        var alimentador = await CargarAsync(id, ct);
        alimentador.Nombre = request.Nombre;
        alimentador.KcalPorGramo = request.KcalPorGramo;
        alimentador.IntervaloMinimoHoras = request.IntervaloMinimoHoras;
        alimentador.VersionConfiguracion++;
        await db.SaveChangesAsync(ct);
        return ADto(alimentador, RolAlimentador.Dueno);
    }

    public async Task<IReadOnlyList<MiembroDto>> ListarMiembrosAsync(int id, CancellationToken ct = default)
    {
        await acceso.RequerirAccesoAsync(id, ct);
        return await db.MiembrosAlimentador.AsNoTracking()
            .Where(m => m.AlimentadorId == id)
            .Select(m => new MiembroDto(m.UsuarioId, m.Usuario.Nombre, m.Usuario.Email, m.Rol))
            .ToListAsync(ct);
    }

    public async Task<MiembroDto> AgregarMiembroAsync(int id, AgregarMiembroRequest request, CancellationToken ct = default)
    {
        await acceso.RequerirDuenoAsync(id, ct);
        var email = request.Email.Trim().ToLowerInvariant();
        var invitado = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new NoEncontradoException("Usuario", email);
        if (await db.MiembrosAlimentador.AnyAsync(m => m.AlimentadorId == id && m.UsuarioId == invitado.Id, ct))
            throw new ConflictoException("El usuario ya tiene acceso a este alimentador.");

        db.MiembrosAlimentador.Add(new MiembroAlimentador { AlimentadorId = id, UsuarioId = invitado.Id, Rol = request.Rol });
        await db.SaveChangesAsync(ct);
        return new MiembroDto(invitado.Id, invitado.Nombre, invitado.Email, request.Rol);
    }

    public async Task CambiarRolAsync(int id, int usuarioId, CambiarRolRequest request, CancellationToken ct = default)
    {
        await acceso.RequerirDuenoAsync(id, ct);
        var miembro = await BuscarMiembroAsync(id, usuarioId, ct);
        if (miembro.Rol == RolAlimentador.Dueno && request.Rol != RolAlimentador.Dueno)
            await AsegurarOtroDuenoAsync(id, usuarioId, ct);
        miembro.Rol = request.Rol;
        await db.SaveChangesAsync(ct);
    }

    public async Task QuitarMiembroAsync(int id, int usuarioId, CancellationToken ct = default)
    {
        await acceso.RequerirDuenoAsync(id, ct);
        var miembro = await BuscarMiembroAsync(id, usuarioId, ct);
        if (miembro.Rol == RolAlimentador.Dueno)
            await AsegurarOtroDuenoAsync(id, usuarioId, ct);
        db.MiembrosAlimentador.Remove(miembro);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Alimentador> CargarAsync(int id, CancellationToken ct)
        => await db.Alimentadores.Include(a => a.Gateway).FirstOrDefaultAsync(a => a.Id == id, ct)
           ?? throw new NoEncontradoException("Alimentador", id);

    private async Task<MiembroAlimentador> BuscarMiembroAsync(int id, int usuarioId, CancellationToken ct)
        => await db.MiembrosAlimentador.FirstOrDefaultAsync(m => m.AlimentadorId == id && m.UsuarioId == usuarioId, ct)
           ?? throw new NoEncontradoException("Miembro", usuarioId);

    private async Task AsegurarOtroDuenoAsync(int id, int usuarioId, CancellationToken ct)
    {
        bool hayOtro = await db.MiembrosAlimentador.AnyAsync(
            m => m.AlimentadorId == id && m.UsuarioId != usuarioId && m.Rol == RolAlimentador.Dueno, ct);
        if (!hayOtro)
            throw new ReglaNegocioException("El alimentador debe tener al menos un dueño.");
    }

    private static AlimentadorDto ADto(Alimentador a, RolAlimentador rol) => new(
        a.Id, a.Codigo, a.Nombre, a.KcalPorGramo, a.IntervaloMinimoHoras, rol, a.Estado());
}
