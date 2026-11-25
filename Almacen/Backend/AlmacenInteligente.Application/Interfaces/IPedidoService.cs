using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IPedidoService
{
    Task<Resultado<PedidoDto>> CrearAsync(CrearPedidoDto dto, int usuarioId, CancellationToken ct = default);
    Task<Resultado<List<PedidoDto>>> ListarAsync(string? estado, int? limite, CancellationToken ct = default);
    Task<Resultado<PedidoRecibidoDto>> RecibirAsync(long id, int? cantidadRecibida, int usuarioId, CancellationToken ct = default);
    Task<Resultado<PedidoDto>> CancelarAsync(long id, CancellationToken ct = default);
}
