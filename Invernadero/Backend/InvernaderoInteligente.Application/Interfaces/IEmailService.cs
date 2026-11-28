
using InvernaderoInteligente.Application.DTOs.Emails;

namespace InvernaderoInteligente.Application.Interfaces;

public interface IEmailService
{
    Task EnviarCorreoAsync(EnviarCorreoDto request, CancellationToken cancellationToken = default);
}