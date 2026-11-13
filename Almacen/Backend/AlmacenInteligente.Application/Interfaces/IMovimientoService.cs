using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IMovimientoService
{
    Task<Resultado<MovimientoRegistradoDto>> RegistrarManualAsync(RegistrarMovimientoDto dto, int usuarioId, CancellationToken ct = default);
    Task<List<MovimientoDto>> ListarAsync(string? productoId, int? usuarioId, int? limite, CancellationToken ct = default);
}
