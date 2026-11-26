using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IFotoProductoService
{
    Task<Resultado<IdentificacionDto>> IdentificarAsync(byte[] foto, CancellationToken ct = default);
    Task<Resultado<ProductoDto>> CrearDesdeFotoAsync(CrearDesdeFotoDto dto, CancellationToken ct = default);
}
