using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class PedidoRepository(AlmacenDbContext db) : IPedidoRepository
{
    public Task<List<Pedido>> ListarAsync(string? estado, int limite, CancellationToken ct = default)
    {
        var consulta = db.Pedidos
            .AsNoTracking()
            .Include(p => p.Producto)
            .Include(p => p.Proveedor)
            .Include(p => p.Usuario)
            .AsQueryable();

        if (estado is not null)
            consulta = consulta.Where(p => p.Estado == estado);

        return consulta
            .OrderByDescending(p => p.FechaSolicitud)
            .ThenByDescending(p => p.Id)
            .Take(limite)
            .ToListAsync(ct);
    }

    public Task<Pedido?> ObtenerPorIdAsync(long id, CancellationToken ct = default) =>
        db.Pedidos
            .Include(p => p.Producto).ThenInclude(pr => pr.Espacios)
            .Include(p => p.Proveedor)
            .Include(p => p.Usuario)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<bool> ExisteSolicitadoAsync(string productoId, CancellationToken ct = default) =>
        db.Pedidos.AnyAsync(p => p.ProductoId == productoId && p.Estado == EstadosPedido.Solicitado, ct);

    public void Agregar(Pedido pedido) => db.Pedidos.Add(pedido);

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
