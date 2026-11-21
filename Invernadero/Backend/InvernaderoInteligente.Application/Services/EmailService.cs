using Azure;
using Azure.Communication.Email;
using InvernaderoInteligente.Application.DTOs.Emails; // Ajusta tu namespace si es necesario
using InvernaderoInteligente.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace InvernaderoInteligente.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly EmailClient _emailClient;
    private readonly string _senderAddress;

    public EmailService(IConfiguration configuration)
    {
        string connectionString = configuration["AzureCommunicationServices:ConnectionString"] 
            ?? throw new InvalidOperationException("Falta la cadena de conexión de Azure Email.");
        
        _senderAddress = configuration["AzureCommunicationServices:SenderAddress"] 
            ?? throw new InvalidOperationException("Falta la dirección de envío (SenderAddress).");

        _emailClient = new EmailClient(connectionString);
    }

    public async Task SendEmailAsync(EnviarCorreoDto request)
    {
        // Usamos las propiedades exactas de tu DTO: Destinatario, Asunto, Mensaje
        var emailMessage = new EmailMessage(
            senderAddress: _senderAddress,
            recipientAddress: request.Destinatario,
            content: new EmailContent(request.Asunto)
            {
                PlainText = request.Mensaje,
                HtmlContent = $"<html><body><p>{request.Mensaje}</p></body></html>"
            }
        );

        // Envío mediante Azure Communication Services
        EmailSendOperation operation = await _emailClient.SendAsync(WaitUntil.Completed, emailMessage);
        
        if (operation.HasCompleted && operation.Value.Status != EmailSendStatus.Succeeded)
        {
            throw new Exception($"No se pudo enviar el correo a {request.Destinatario}. Estado: {operation.Value.Status}");
        }
    }
}