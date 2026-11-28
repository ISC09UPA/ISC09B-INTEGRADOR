
using System.ComponentModel.DataAnnotations;

namespace InvernaderoInteligente.Application.DTOs.Emails;

public class EnviarCorreoDto
{
    [Required]
    [EmailAddress]
    public string Destinatario { get; set; } = string.Empty;

    [Required]
    public string Asunto { get; set; } = string.Empty;

    [Required]
    public string Mensaje { get; set; } = string.Empty;
}