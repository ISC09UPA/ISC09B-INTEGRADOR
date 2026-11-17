using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class LecturaRepository(AlmacenDbContext db) : ILecturaRepository
{
    public Task<bool> ExisteAsync(string lecturaId, CancellationToken ct = default) =>
        db.LecturasDispositivo.AnyAsync(l => l.LecturaId == lecturaId, ct);

    public Task<Espacio?> ObtenerEspacioAsync(string espacioId, CancellationToken ct = default) =>
        db.Espacios
            .Include(e => e.Producto)
                .ThenInclude(p => p!.Espacios)
            .FirstOrDefaultAsync(e => e.Id == espacioId, ct);

    public Task<Alerta?> ObtenerAlertaActivaAsync(string productoId, CancellationToken ct = default) =>
        db.Alertas
            .Where(a => a.ProductoId == productoId && a.Estado == EstadosAlerta.Activa)
            .OrderByDescending(a => a.CreadaEn)
            .FirstOrDefaultAsync(ct);

    public void Agregar(LecturaDispositivo lectura) => db.LecturasDispositivo.Add(lectura);
    public void Agregar(LecturaPeso lectura) => db.LecturasPeso.Add(lectura);
    public void Agregar(Movimiento movimiento) => db.Movimientos.Add(movimiento);
    public void Agregar(Alerta alerta) => db.Alertas.Add(alerta);

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
