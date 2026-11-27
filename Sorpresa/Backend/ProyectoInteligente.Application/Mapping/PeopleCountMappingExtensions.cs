using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Mappings;

public static class PeopleCountMappingExtensions
{
    public static PeopleCountDto ToDto(this PeopleCount peopleCount)
    {
        return new PeopleCountDto
        {
            Personas = peopleCount.ResumenIa?.Personas ?? peopleCount.TotalPeople,
            Hora = peopleCount.ResumenIa?.Hora ?? DateTime.Now.ToString("HH:mm:ss"),
            Resumen = peopleCount.ResumenIa?.Resumen ?? $"Se observan {peopleCount.TotalPeople} personas en la imagen.",
            TotalPeople = peopleCount.TotalPeople,
            StandingPeople = peopleCount.StandingPeople
        };
    }
}
