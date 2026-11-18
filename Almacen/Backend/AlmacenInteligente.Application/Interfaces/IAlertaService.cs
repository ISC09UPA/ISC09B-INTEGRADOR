using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IAlertaService
{
    Task<Resultado<List<AlertaDto>>> ListarAsync(string? estado, int? limite, CancellationToken ct = default);
    Task<Resultado<AlertaDto>> AtenderAsync(long id, CancellationToken ct = default);
}
