using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AdminEmbebidosService(IAppDbContext db, ITokenService tokens, IAlmacenamientoArchivos archivos)
    : IAdminEmbebidosService
{
    public async Task<IReadOnlyList<GatewayAdminDto>> ListarGatewaysAsync(CancellationToken ct = default)
    {
        var limiteHeartbeat = Mapeos.LimiteHeartbeat(DateTimeOffset.UtcNow);
        return await db.Gateways.AsNoTracking()
            .OrderBy(g => g.DeviceId)
            .Select(g => new GatewayAdminDto(
                g.Id, g.DeviceId,
                g.Propietario == null ? null : new UsuarioResumenDto(g.Propietario.Id, g.Propietario.Nombre, g.Propietario.Email),
                g.UltimoHeartbeat,
                g.SinConexionDesde == null && g.UltimoHeartbeat != null && g.UltimoHeartbeat > limiteHeartbeat,
                g.SinConexionDesde,
                g.SincronizandoDesde != null,
                g.SincronizandoDesde,
                g.CreadoEn,
                g.Alimentadores
                    .OrderBy(a => a.Codigo)
                    .Select(a => new AlimentadorEmbebidoDto(
                        a.Id, a.Codigo, a.Nombre, a.EnLinea, a.UltimoEstado, a.VersionFirmware, a.VersionModelo,
                        a.NivelTolvaPerroPorcentaje, a.NivelTolvaGatoPorcentaje))
                    .ToList()))
            .ToListAsync(ct);
    }

    public async Task<GatewayClaveResponse> RegenerarClaveAsync(int gatewayId, CancellationToken ct = default)
    {
        var gateway = await db.Gateways.FirstOrDefaultAsync(g => g.Id == gatewayId, ct)
            ?? throw new NoEncontradoException("Gateway", gatewayId);
        var respuesta = GatewayService.AsignarClaveNueva(gateway, tokens);
        await db.SaveChangesAsync(ct);
        return respuesta;
    }

    public async Task<Pagina<EventoAdminDto>> ListarEventosAsync(ConsultaEventos consulta, CancellationToken ct = default)
    {
        var eventos = db.Eventos.AsNoTracking();
        if (consulta.AlimentadorId is { } alimentadorId)
            eventos = eventos.Where(e => e.AlimentadorId == alimentadorId);
        if (consulta.Tipo is { } tipo)
            eventos = eventos.Where(e => e.Tipo == tipo);

        return await eventos
            .OrderByDescending(e => e.OcurridoEn).ThenByDescending(e => e.Id)
            .Select(e => new EventoAdminDto(
                e.Id, e.AlimentadorId, e.Alimentador.Codigo, e.Tipo, e.Tolva, e.OcurridoEn, e.Detalle))
            .PaginarAsync(consulta, ct);
    }

    public async Task<Pagina<FotoDudosaAdminDto>> ListarFotosAsync(ConsultaFotos consulta, CancellationToken ct = default)
    {
        var fotos = db.FotosDudosas.AsNoTracking();
        fotos = (consulta.Estado?.Trim().ToLowerInvariant() ?? "pendientes") switch
        {
            "revisadas" => fotos.Where(f => f.ClaseRevisada != null),
            "todas" => fotos,
            _ => fotos.Where(f => f.Subida && f.ClaseRevisada == null)
        };

        return await Proyectar(fotos.OrderByDescending(f => f.TomadaEn).ThenByDescending(f => f.Id))
            .PaginarAsync(consulta, ADto, ct);
    }

    public async Task<FotoDudosaAdminDto> RevisarFotoAsync(int id, RevisarFotoRequest request, CancellationToken ct = default)
    {
        var foto = await db.FotosDudosas.FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new NoEncontradoException("Foto", id);
        if (!foto.Subida)
            throw new ReglaNegocioException("La foto todavía no se ha subido; no se puede revisar.");

        foto.ClaseRevisada = request.Clase;
        await db.SaveChangesAsync(ct);

        return ADto(await Proyectar(db.FotosDudosas.AsNoTracking().Where(f => f.Id == id)).FirstAsync(ct));
    }

    /// <summary>La URL SAS se genera en memoria; en la consulta solo viaja el nombre del blob.</summary>
    private sealed record FilaFoto(
        int Id, int AlimentadorId, string AlimentadorCodigo, ClaseDetectada ClasePredicha, double Confianza,
        DateTimeOffset TomadaEn, bool Subida, ClaseDetectada? ClaseRevisada, string BlobNombre);

    private static IQueryable<FilaFoto> Proyectar(IQueryable<FotoDudosa> fotos)
        => fotos.Select(f => new FilaFoto(
            f.Id, f.AlimentadorId, f.Alimentador.Codigo, f.ClasePredicha, f.Confianza,
            f.TomadaEn, f.Subida, f.ClaseRevisada, f.BlobNombre));

    private FotoDudosaAdminDto ADto(FilaFoto f) => new(
        f.Id, f.AlimentadorId, f.AlimentadorCodigo, f.ClasePredicha, f.Confianza, f.TomadaEn, f.Subida, f.ClaseRevisada,
        f.Subida
            ? archivos.GenerarUrlDescarga(Constantes.ContenedorFotos, f.BlobNombre, Constantes.VigenciaUrlFoto).ToString()
            : null);
}
