using InvernaderoInteligente.Application.DTOs;

namespace InvernaderoInteligente.Application.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponseDto?> LoginAsync(LoginRequestDto loginRequest);
        Task<LoginResponseDto?> RegisterAsync(
            RegisterRequestDto registerRequest,
            CancellationToken cancellationToken = default);
        Task<UsuarioDto?> GetByIdAsync(int id_Usuario);
    }
}
