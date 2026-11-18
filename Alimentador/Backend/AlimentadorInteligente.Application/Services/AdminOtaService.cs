using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AdminOtaService(IAppDbContext db, IUsuarioActual usuario, INotificadorTiempoReal notificador) : IAdminOtaService
{
    public const string MotivoNoExiste = "No existe.";
    public const string MotivoEnCurso = "Ya tiene una actualización en curso.";
    public const string MotivoMismaVersion = "Ya tiene esa versión.";

    public async Task<DespliegueOtaResponse> DesplegarAsync(CrearDespliegueOtaRequest request, CancellationToken ct = default)
    {
        var artefacto = await db.ArtefactosOta.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.ArtefactoId, ct)
            ?? throw new NoEncontradoException("Artefacto OTA", request.ArtefactoId);

        // El validador garantiza de 1 a 200 ids sin repetir
        var ids = request.AlimentadorIds.ToList();
        var versiones = await db.Alimentadores.AsNoTracking()
            .Where(a => ids.Contains(a.Id))
            .Select(a => new { a.Id, a.VersionFirmware, a.VersionModelo })
            .ToDictionaryAsync(a => a.Id, ct);
        var conOtaEnCurso = (await db.Comandos.AsNoTracking()
                .Where(c => ids.Contains(c.AlimentadorId) && c.Tipo == TipoComando.Ota
                            && (c.Estado == EstadoComando.Pendiente || c.Estado == EstadoComando.Entregado))
                .Select(c => c.AlimentadorId)
                .ToListAsync(ct))
            .ToHashSet();

        var nuevos = new List<Comando>();
        var omitidos = new List<DespliegueOmitidoDto>();
        foreach (var id in ids)
        {
            if (!versiones.TryGetValue(id, out var alimentador))
            {
                omitidos.Add(new DespliegueOmitidoDto(id, MotivoNoExiste));
                continue;
            }
            if (conOtaEnCurso.Contains(id))
            {
                omitidos.Add(new DespliegueOmitidoDto(id, MotivoEnCurso));
                continue;
            }
            var versionActual = artefacto.Tipo == TipoArtefactoOta.Firmware ? alimentador.VersionFirmware : alimentador.VersionModelo;
            if (request.OmitirSiYaTieneVersion && versionActual == artefacto.Version)
            {
                omitidos.Add(new DespliegueOmitidoDto(id, MotivoMismaVersion));
                continue;
            }

            // Igual que LanzarOtaAsync: sin vigencia, se aplica cuando el alimentador vuelva a conectarse
            nuevos.Add(new Comando
            {
                AlimentadorId = id,
                SolicitadoPorId = usuario.Id,
                Tipo = TipoComando.Ota,
                ArtefactoOtaId = artefacto.Id
            });
        }

        if (nuevos.Count > 0)
        {
            db.Comandos.AddRange(nuevos);
            await db.SaveChangesAsync(ct);
            foreach (var comando in nuevos)
                await notificador.ComandoActualizadoAsync(comando.AlimentadorId, comando.ADto(), ct);
        }

        var idsCreados = nuevos.Select(c => c.Id).ToList();
        var creados = await db.Comandos.AsNoTracking()
            .Where(c => idsCreados.Contains(c.Id))
            .Select(Mapeos.ComandoAdmin)
            .ToListAsync(ct);
        // Mismo orden en que llegaron los alimentadores
        var orden = ids.Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i);
        return new DespliegueOtaResponse(creados.OrderBy(c => orden[c.AlimentadorId]).ToList(), omitidos);
    }

    public async Task<Pagina<ComandoAdminDto>> ListarAsync(ConsultaDespliegues consulta, CancellationToken ct = default)
    {
        var comandos = db.Comandos.AsNoTracking().Where(c => c.Tipo == TipoComando.Ota);
        if (consulta.Estado is { } estado)
            comandos = comandos.Where(c => c.Estado == estado);
        if (consulta.ArtefactoId is { } artefactoId)
            comandos = comandos.Where(c => c.ArtefactoOtaId == artefactoId);
        if (consulta.AlimentadorId is { } alimentadorId)
            comandos = comandos.Where(c => c.AlimentadorId == alimentadorId);

        return await comandos
            .OrderByDescending(c => c.CreadoEn).ThenByDescending(c => c.Id)
            .Select(Mapeos.ComandoAdmin)
            .PaginarAsync(consulta, ct);
    }

    public async Task<ComandoAdminDto> CancelarAsync(int id, CancellationToken ct = default)
    {
        var comando = await db.Comandos.FirstOrDefaultAsync(c => c.Id == id && c.Tipo == TipoComando.Ota, ct)
            ?? throw new NoEncontradoException("Despliegue OTA", id);
        if (comando.Estado != EstadoComando.Pendiente)
            throw new ConflictoException("Solo se puede cancelar una actualización pendiente; esta ya se entregó a la Raspberry Pi o terminó.");

        comando.Estado = EstadoComando.Fallido;
        comando.Error = Comando.ErrorCancelado;
        comando.CompletadoEn = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await notificador.ComandoActualizadoAsync(comando.AlimentadorId, comando.ADto(), ct);

        return await db.Comandos.AsNoTracking()
            .Where(c => c.Id == id)
            .Select(Mapeos.ComandoAdmin)
            .FirstAsync(ct);
    }
}
