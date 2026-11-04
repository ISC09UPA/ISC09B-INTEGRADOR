using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IProductoService
{
    Task<List<ProductoDto>> ListarAsync(CancellationToken ct = default);
    Task<Resultado<ProductoDto>> ObtenerAsync(string id, CancellationToken ct = default);
    Task<Resultado<ProductoDto>> CrearAsync(CrearProductoDto dto, CancellationToken ct = default);
    Task<Resultado<ProductoDto>> ActualizarReordenAsync(string id, int puntoReorden, CancellationToken ct = default);
    Task<Resultado<bool>> DarDeBajaAsync(string id, CancellationToken ct = default);
}
