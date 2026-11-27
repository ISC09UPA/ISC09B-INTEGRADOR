using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Interfaces;

public interface IAzureOpenAIService
{
    Task<ResumenDeteccion> GenerarResumenAsync(string contextoCrudo, int totalDetectado, string horaFallback);
}
