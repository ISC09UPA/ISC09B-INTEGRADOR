using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface ILecturaService
{
    Task<Resultado<LecturaProcesadaDto>> ProcesarAsync(LecturaDispositivoDto? lectura, CancellationToken ct = default);
}
