using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Interfaces;

public interface IPeopleCounterService
{
    Task<PeopleCount> CountAsync(Stream image, CancellationToken cancellationToken = default);
}
