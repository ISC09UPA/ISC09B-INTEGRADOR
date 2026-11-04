using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Infrastructure.Repositories;

public class PatientRepository : IPatientRepository
{
    private readonly List<Patient> _patients = new();

    public Task<IEnumerable<Patient>> GetAllAsync() => Task.FromResult(_patients.AsEnumerable());

    public Task<Patient?> GetByIdAsync(Guid id) => Task.FromResult(_patients.FirstOrDefault(p => p.Id == id));

    public Task<Patient> AddAsync(Patient patient)
    {
        _patients.Add(patient);
        return Task.FromResult(patient);
    }

    public Task<Patient> UpdateAsync(Patient patient)
    {
        var index = _patients.FindIndex(p => p.Id == patient.Id);
        if (index >= 0)
            _patients[index] = patient;
        return Task.FromResult(patient);
    }

    public Task DeleteAsync(Guid id)
    {
        var patient = _patients.FirstOrDefault(p => p.Id == id);
        if (patient != null)
            _patients.Remove(patient);
        return Task.CompletedTask;
    }
}
