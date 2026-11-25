using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class AlertaRepository(AlmacenDbContext db) : IAlertaRepository
{
    public Task<List<Alerta>> ListarAsync(string? estado, int limite, CancellationToken ct = default)
    {
        var consulta = db.Alertas
            .AsNoTracking()
            .Include(a => a.Producto)
            .Include(a => a.Pedidos) // para saber si ya hay un pedido en camino (pedidoId)
            .AsQueryable();

        if (estado is not null)
            consulta = consulta.Where(a => a.Estado == estado);

        return consulta
            .OrderByDescending(a => a.CreadaEn)
            .ThenByDescending(a => a.Id)
            .Take(limite)
            .ToListAsync(ct);
    }

    public Task<Alerta?> ObtenerPorIdAsync(long id, CancellationToken ct = default) =>
        db.Alertas
            .Include(a => a.Producto)
            .Include(a => a.Pedidos)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<Alerta?> ObtenerActivaAsync(string productoId, CancellationToken ct = default) =>
        db.Alertas
            .Where(a => a.ProductoId == productoId && a.Estado == EstadosAlerta.Activa)
            .OrderByDescending(a => a.CreadaEn)
            .FirstOrDefaultAsync(ct);

    public void Agregar(Alerta alerta) => db.Alertas.Add(alerta);

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
