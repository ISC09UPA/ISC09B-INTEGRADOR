using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EstacionamientoInteligente.Infrastructure.DAOs;

/// <summary>Consultas a la tabla <c>Alertas</c>.</summary>
public class AlertaDao(EstacionamientoDbContext db) : IAlertaDao
{
    public async Task<IReadOnlyList<Alerta>> ListarAsync(bool soloPendientes)
    {
        var consulta = db.Alertas.AsQueryable();
        if (soloPendientes)
            consulta = consulta.Where(a => !a.Atendida);

        return await consulta
            .OrderByDescending(a => a.Fecha)
            .ToListAsync();
    }

    public Task<Alerta?> ObtenerPorIdAsync(Guid id) =>
        db.Alertas.FirstOrDefaultAsync(a => a.Id == id);

    public Task<bool> ExistePendienteAsync(TipoAlerta tipo, Guid vehiculoId) =>
        db.Alertas.AnyAsync(a => !a.Atendida && a.Tipo == tipo && a.VehiculoId == vehiculoId);

    public Task<int> ContarAsync(TipoAlerta tipo, DateTime desde, DateTime hasta) =>
        db.Alertas.CountAsync(a => a.Tipo == tipo && a.Fecha >= desde && a.Fecha < hasta);

    public void Agregar(Alerta alerta) => db.Alertas.Add(alerta);
}
