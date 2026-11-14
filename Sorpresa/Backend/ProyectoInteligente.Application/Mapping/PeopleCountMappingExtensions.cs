using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Mappings;

public static class PeopleCountMappingExtensions
{
  public static PeopleCountDto ToDto(this PeopleCount peopleCount)
  {
    return new PeopleCountDto
    {
      TotalPeople = peopleCount.TotalPeople,
      StandingPeople = peopleCount.StandingPeople
    };
  }
}
