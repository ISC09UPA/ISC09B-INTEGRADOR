using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Mappings;

public static class PatientMappingExtensions
{
  public static PatientDto ToDto(this Patient patient)
  {
    return new PatientDto
    {
      Id = patient.Id,
      FirstName = patient.FirstName,
      LastName = patient.LastName,
      Email = patient.Email,
      PhoneNumber = patient.PhoneNumber,
      DateOfBirth = patient.DateOfBirth,
      Symptoms = patient.Symptoms,
      Notes = patient.Notes,
      CreatedAt = patient.CreatedAt,
      Status = patient.Status
    };
  }
}
