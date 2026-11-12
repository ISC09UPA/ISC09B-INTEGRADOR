using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class GatewayService(IAppDbContext db, IUsuarioActual usuario, ITokenService tokens) : IGatewayService
{
    public async Task<IReadOnlyList<GatewayDto>> ListarAsync(CancellationToken ct = default)
        => await db.Gateways.AsNoTracking()
            .Where(g => g.PropietarioId == usuario.Id)
            .OrderBy(g => g.DeviceId)
            .Select(g => new GatewayDto(g.Id, g.DeviceId, g.UltimoHeartbeat, g.SincronizandoDesde != null))
            .ToListAsync(ct);

    public async Task<GatewayClaveResponse> CrearAsync(CrearGatewayRequest request, CancellationToken ct = default)
    {
        if (await db.Gateways.AnyAsync(g => g.DeviceId == request.DeviceId, ct))
            throw new ConflictoException("Ya existe un gateway con ese identificador.");

        var clave = tokens.GenerarRefreshToken();
        var gateway = new Gateway
        {
            DeviceId = request.DeviceId,
            DeviceKeyHash = tokens.Hash(clave),
            PropietarioId = usuario.Id
        };
        db.Gateways.Add(gateway);
        await db.SaveChangesAsync(ct);
        return new GatewayClaveResponse(gateway.Id, gateway.DeviceId, clave);
    }

    public async Task<GatewayClaveResponse> RegenerarClaveAsync(int id, CancellationToken ct = default)
    {
        var gateway = await db.Gateways.FirstOrDefaultAsync(g => g.Id == id, ct)
            ?? throw new NoEncontradoException("Gateway", id);
        if (gateway.PropietarioId != usuario.Id)
            throw new ProhibidoException();

        var clave = tokens.GenerarRefreshToken();
        gateway.DeviceKeyHash = tokens.Hash(clave);
        await db.SaveChangesAsync(ct);
        return new GatewayClaveResponse(gateway.Id, gateway.DeviceId, clave);
    }
}
