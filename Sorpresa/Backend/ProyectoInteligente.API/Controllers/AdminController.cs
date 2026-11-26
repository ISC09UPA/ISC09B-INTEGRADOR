using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Roles = "admin")]
public class AdminController(IAppDbContext db) : ControllerBase
{
    [HttpGet("room")]
    public async Task<IActionResult> Room(CancellationToken ct)
    {
        var personas = await db.OcupacionesSala.OrderByDescending(o => o.Id).Select(o => (int?)o.Personas).FirstOrDefaultAsync(ct);
        var valor = await db.Configuraciones.Where(c => c.Clave == "capacidad_sala").Select(c => c.Valor).FirstOrDefaultAsync(ct);
        int.TryParse(valor, out var capacidad);

        return Ok(new
        {
            personas = personas ?? 0,
            capacidad,
            enEspera = await db.Turnos.CountAsync(t => t.Estado == EstadoTurno.EnEspera, ct),
            enConsulta = await db.Turnos.CountAsync(t => t.Estado == EstadoTurno.Llamado || t.Estado == EstadoTurno.EnConsulta, ct),
            alertasSinLeer = await db.Alertas.CountAsync(x => !x.Leida, ct)
        });
    }

    [HttpGet("alertas")]
    public async Task<IActionResult> Alertas(CancellationToken ct) =>
        Ok(await db.Alertas.AsNoTracking().OrderByDescending(x => x.Id).Take(50)
            .Select(x => new { x.Id, x.Tipo, x.Mensaje, x.Leida, x.CreadoEn }).ToListAsync(ct));

    [HttpPost("alertas/{id:int}/read")]
    public async Task<IActionResult> Read(int id, CancellationToken ct)
    {
        var alerta = await db.Alertas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (alerta == null) return NotFound();
        alerta.Leida = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
