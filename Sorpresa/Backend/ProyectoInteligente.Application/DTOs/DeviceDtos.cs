using System.ComponentModel.DataAnnotations;
using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.Application.DTOs;

public record ScanRequest(
    [Required, MaxLength(200)] string UidLeido,
    bool Presencia,
    ResultadoAcceso Resultado,
    [MaxLength(200)] string? Motivo,
    DateTime? CreadoEn);

public record OccupancyRequest([Range(0, 1000)] int Personas, [MaxLength(200)] string? FotoUrl);
