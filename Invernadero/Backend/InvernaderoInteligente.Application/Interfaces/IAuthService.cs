using InvernaderoInteligente.Application.DTOs;

namespace InvernaderoInteligente.Application.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponseDto?> LoginAsync(LoginRequestDto loginRequest);
        Task<LoginResponseDto?> RegisterAsync(RegisterRequestDto registerRequest);
        Task<UsuarioDto?> GetByIdAsync(Guid id_Usuario);
    }
}
