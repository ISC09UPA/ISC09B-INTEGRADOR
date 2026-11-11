using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IAuthService
{
    Task<Resultado<LoginRespuestaDto>> LoginAsync(LoginDto dto, CancellationToken ct = default);
}
