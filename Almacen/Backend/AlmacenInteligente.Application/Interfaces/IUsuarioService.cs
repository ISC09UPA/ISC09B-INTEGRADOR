using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IUsuarioService
{
    Task<List<UsuarioDto>> ListarAsync(CancellationToken ct = default);
    Task<Resultado<UsuarioDto>> CrearAsync(CrearUsuarioDto dto, CancellationToken ct = default);
    Task<Resultado<bool>> DarDeBajaAsync(int id, int usuarioActualId, CancellationToken ct = default);
}
