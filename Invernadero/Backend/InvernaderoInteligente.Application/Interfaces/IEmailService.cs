
namespace Practica1.Application.Interfaces;

public interface IEmailService
{
    Task EnviarCorreoAsync(
        string destinatario,
        string asunto,
        string mensaje,
        CancellationToken cancellationToken = default);
}