using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Domain.Entities;
using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public class CitasController(IAppDbContext db) : ControllerBase
{
    private const int SlotMinutes = 30;
    private int UserId => int.Parse(User.FindFirst("sub")!.Value);

    // any logged-in user: doctors a patient can book with
    [HttpGet("doctors")]
    public async Task<IActionResult> Doctors(CancellationToken ct) =>
        Ok(await db.Doctores.AsNoTracking().Where(d => d.Usuario.Activo)
            .Select(d => new { Id = d.UsuarioId, d.Usuario.Nombre, d.Especialidad, d.ConsultorioId }).ToListAsync(ct));

    [Authorize(Roles = "paciente")]
    [HttpPost("citas")]
    public async Task<IActionResult> Create(CreateCitaRequest req, CancellationToken ct)
    {
        var uid = UserId;
        var fecha = req.FechaHora.ToUniversalTime();
        if (fecha <= DateTime.UtcNow) return BadRequest(new { message = "La fecha debe ser futura" });

        var doctor = await db.Doctores.FirstOrDefaultAsync(d => d.UsuarioId == req.DoctorId && d.Usuario.Activo, ct);
        if (doctor == null) return BadRequest(new { message = "El doctor no existe" });

        var desde = fecha.AddMinutes(-SlotMinutes);
        var hasta = fecha.AddMinutes(SlotMinutes);
        var ocupado = await db.Citas.AnyAsync(c => c.DoctorId == doctor.UsuarioId
            && c.Estado == EstadoCita.Agendada && c.FechaHora > desde && c.FechaHora < hasta, ct);
        if (ocupado) return Conflict(new { message = "Horario no disponible" });

        var cita = new Cita { PacienteId = uid, DoctorId = doctor.UsuarioId, ConsultorioId = doctor.ConsultorioId, FechaHora = fecha };
        db.Citas.Add(cita);
        await db.SaveChangesAsync(ct);
        return StatusCode(201, new { cita.Id, cita.FechaHora, cita.Estado });
    }

    [Authorize(Roles = "paciente")]
    [HttpGet("citas/mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var uid = UserId;
        return Ok(await db.Citas.AsNoTracking().Where(c => c.PacienteId == uid)
            .OrderByDescending(c => c.FechaHora)
            .Select(c => new { c.Id, c.FechaHora, c.Estado, Doctor = c.Doctor.Usuario.Nombre, Consultorio = c.Consultorio.Nombre })
            .ToListAsync(ct));
    }

    [Authorize(Roles = "paciente")]
    [HttpPost("citas/{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancellationToken ct)
    {
        var uid = UserId;
        var cita = await db.Citas.FirstOrDefaultAsync(c => c.Id == id && c.PacienteId == uid, ct);
        if (cita == null) return NotFound();
        if (cita.Estado != EstadoCita.Agendada) return Conflict(new { message = $"La cita esta {cita.Estado}" });

        cita.Estado = EstadoCita.Cancelada;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize(Roles = "doctor")]
    [HttpGet("doctor/citas")]
    public async Task<IActionResult> DoctorCitas(CancellationToken ct)
    {
        var uid = UserId;
        var hoy = DateTime.UtcNow.Date;
        return Ok(await db.Citas.AsNoTracking()
            .Where(c => c.DoctorId == uid && c.Estado == EstadoCita.Agendada && c.FechaHora >= hoy)
            .OrderBy(c => c.FechaHora)
            .Select(c => new { c.Id, c.FechaHora, Paciente = c.Paciente.Nombre }).ToListAsync(ct));
    }
}
