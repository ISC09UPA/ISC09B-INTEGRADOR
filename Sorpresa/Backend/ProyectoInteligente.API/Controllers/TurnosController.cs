using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public class TurnosController(IAppDbContext db) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirst("sub")!.Value);

    private Task<int?> MiConsultorio(int uid, CancellationToken ct) =>
        db.Doctores.Where(d => d.UsuarioId == uid).Select(d => (int?)d.ConsultorioId).FirstOrDefaultAsync(ct);

    // patient: my active turn and my position in the queue
    [Authorize(Roles = "paciente")]
    [HttpGet("turnos/mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var uid = UserId;
        var turno = await db.Turnos.AsNoTracking()
            .Where(t => t.PacienteId == uid && t.Estado != EstadoTurno.Finalizado)
            .OrderByDescending(t => t.LlegadaEn).FirstOrDefaultAsync(ct);
        if (turno == null) return Ok(new { activo = false });

        var posicion = 0;
        if (turno.Estado == EstadoTurno.EnEspera)
            posicion = 1 + await db.Turnos.CountAsync(t => t.ConsultorioId == turno.ConsultorioId
                && t.Estado == EstadoTurno.EnEspera && t.LlegadaEn < turno.LlegadaEn, ct);

        return Ok(new { activo = true, turno.Codigo, turno.Estado, posicion });
    }

    // doctor: the queue of my office
    [Authorize(Roles = "doctor")]
    [HttpGet("doctor/queue")]
    public async Task<IActionResult> Queue(CancellationToken ct)
    {
        var consultorio = await MiConsultorio(UserId, ct);
        if (consultorio == null) return NotFound(new { message = "Doctor sin consultorio" });

        var lista = await db.Turnos.AsNoTracking()
            .Where(t => t.ConsultorioId == consultorio && t.Estado != EstadoTurno.Finalizado)
            .OrderBy(t => t.LlegadaEn)
            .Select(t => new { t.Id, t.Codigo, Paciente = t.Paciente.Nombre, t.Estado, t.LlegadaEn })
            .ToListAsync(ct);
        return Ok(lista);
    }

    // doctor: call the next waiting patient
    [Authorize(Roles = "doctor")]
    [HttpPost("doctor/queue/next")]
    public async Task<IActionResult> Next(CancellationToken ct)
    {
        var consultorio = await MiConsultorio(UserId, ct);
        if (consultorio == null) return NotFound(new { message = "Doctor sin consultorio" });

        var turno = await db.Turnos.Include(t => t.Paciente)
            .Where(t => t.ConsultorioId == consultorio && t.Estado == EstadoTurno.EnEspera)
            .OrderBy(t => t.LlegadaEn).FirstOrDefaultAsync(ct);
        if (turno == null) return NotFound(new { message = "Cola vacia" });

        turno.Estado = EstadoTurno.Llamado;
        turno.LlamadoEn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new { turno.Id, turno.Codigo, Paciente = turno.Paciente.Nombre, turno.Estado });
    }

    [Authorize(Roles = "doctor")]
    [HttpPost("turnos/{id:int}/start")]
    public Task<IActionResult> Start(int id, CancellationToken ct) =>
        Advance(id, EstadoTurno.Llamado, EstadoTurno.EnConsulta, ct);

    [Authorize(Roles = "doctor")]
    [HttpPost("turnos/{id:int}/finish")]
    public Task<IActionResult> Finish(int id, CancellationToken ct) =>
        Advance(id, EstadoTurno.EnConsulta, EstadoTurno.Finalizado, ct);

    private async Task<IActionResult> Advance(int id, EstadoTurno desde, EstadoTurno hacia, CancellationToken ct)
    {
        var consultorio = await MiConsultorio(UserId, ct);
        var turno = await db.Turnos.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (turno == null) return NotFound();
        if (turno.ConsultorioId != consultorio) return Forbid();
        if (turno.Estado != desde) return Conflict(new { message = $"El turno esta en {turno.Estado}" });

        turno.Estado = hacia;
        if (hacia == EstadoTurno.EnConsulta)
        {
            turno.InicioConsulta = DateTime.UtcNow;
        }
        else
        {
            turno.FinConsulta = DateTime.UtcNow;
            if (turno.CitaId != null)
            {
                var cita = await db.Citas.FirstOrDefaultAsync(c => c.Id == turno.CitaId, ct);
                if (cita != null) cita.Estado = EstadoCita.Atendida;
            }
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { turno.Id, turno.Codigo, turno.Estado });
    }
}
