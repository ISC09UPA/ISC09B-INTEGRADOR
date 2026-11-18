using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface IAlertaRepository
{
    // estado null = todas. Las más recientes primero, con el producto incluido.
    Task<List<Alerta>> ListarAsync(string? estado, int limite, CancellationToken ct = default);

    // Con seguimiento de cambios (para atenderla).
    Task<Alerta?> ObtenerPorIdAsync(long id, CancellationToken ct = default);

    // Alerta ACTIVA del producto, con seguimiento de cambios; null si no hay.
    Task<Alerta?> ObtenerActivaAsync(string productoId, CancellationToken ct = default);

    void Agregar(Alerta alerta);
    Task GuardarCambiosAsync(CancellationToken ct = default);
}
