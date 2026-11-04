using Microsoft.AspNetCore.Mvc;
using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Domain.Entities;
using ProyectoInteligente.Application.Mappings;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly IPatientRepository _repository;

    public PatientsController(IPatientRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientDto>>> GetAll()
    {
        var patients = await _repository.GetAllAsync();
        var result = patients.Select(p => p.ToDto());
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PatientDto>> GetById(Guid id)
    {
        var patient = await _repository.GetByIdAsync(id);
        if (patient == null) return NotFound();

        return Ok(new PatientDto
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
        });
    }

    [HttpPost]
    public async Task<ActionResult<PatientDto>> Create(CreatePatientDto dto)
    {
        var patient = new Patient
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            DateOfBirth = dto.DateOfBirth,
            Symptoms = dto.Symptoms,
            Notes = dto.Notes,
            Status = "Waiting"
        };

        await _repository.AddAsync(patient);

        var result = patient.ToDto();

        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PatientDto>> Update(Guid id, UpdatePatientDto dto)
    {
        var patient = await _repository.GetByIdAsync(id);
        if (patient == null) return NotFound();

        if (dto.Symptoms != null) patient.Symptoms = dto.Symptoms;
        if (dto.Notes != null) patient.Notes = dto.Notes;
        if (dto.Status != null) patient.Status = dto.Status;

        await _repository.UpdateAsync(patient);

        return Ok(new PatientDto
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
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _repository.DeleteAsync(id);
        return NoContent();
    }
}
