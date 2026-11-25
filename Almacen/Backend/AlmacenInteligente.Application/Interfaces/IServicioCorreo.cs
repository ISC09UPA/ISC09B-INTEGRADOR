namespace AlmacenInteligente.Application.Interfaces;

// Envío de correos (Azure Communication Services Email). Nunca lanza excepción:
// devuelve true si el servicio aceptó el correo y false si falló o no está configurado.
public interface IServicioCorreo
{
    Task<bool> EnviarAsync(string destinatario, string asunto, string textoPlano, string html, CancellationToken ct = default);
}
