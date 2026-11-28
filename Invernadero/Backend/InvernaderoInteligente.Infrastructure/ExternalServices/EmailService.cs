using Azure;
using Azure.Communication.Email;
using InvernaderoInteligente.Application.DTOs.Emails;
using InvernaderoInteligente.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace InvernaderoInteligente.Infrastructure.ExternalServices;

public sealed class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration) => _configuration = configuration;

    public async Task EnviarCorreoAsync(
        EnviarCorreoDto request,
        CancellationToken cancellationToken = default)
    {
        var connectionString = _configuration["AzureCommunicationServices:ConnectionString"];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Configura AzureCommunicationServices:ConnectionString para enviar correos.");
        }

        var senderAddress = _configuration["AzureCommunicationServices:SenderAddress"];
        if (string.IsNullOrWhiteSpace(senderAddress))
        {
            throw new InvalidOperationException(
                "Configura AzureCommunicationServices:SenderAddress para enviar correos.");
        }

        var emailClient = new EmailClient(connectionString);
        var emailMessage = new EmailMessage(
            senderAddress: senderAddress,
            recipientAddress: request.Destinatario,
            content: new EmailContent(request.Asunto)
            {
                PlainText = request.Mensaje
            });

        var operation = await emailClient.SendAsync(
            WaitUntil.Completed,
            emailMessage,
            cancellationToken);

        if (operation.Value.Status != EmailSendStatus.Succeeded)
        {
            throw new InvalidOperationException(
                $"No se pudo enviar el correo a {request.Destinatario}. Estado: {operation.Value.Status}");
        }
    }
}
