using System.ComponentModel.DataAnnotations;

namespace ProyectoInteligente.Application.DTOs;

public record CreateCitaRequest([Required] int DoctorId, [Required] DateTime FechaHora);
