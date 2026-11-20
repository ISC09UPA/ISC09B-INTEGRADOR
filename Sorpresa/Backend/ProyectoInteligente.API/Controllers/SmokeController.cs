using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Application.Common.Interfaces;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SmokeController(IAppDbContext db) : ControllerBase
{
    [HttpGet("roles")]
    public async Task<IActionResult> Roles() =>
        Ok(await db.Roles.OrderBy(r => r.Id).ToListAsync());

    [HttpGet("usuarios")]
    public async Task<IActionResult> Usuarios() =>
        Ok(await db.Usuarios.OrderBy(u => u.Id)
            .Select(u => new { u.Id, u.Nombre, u.Correo, Rol = u.Rol.Nombre }).ToListAsync());

    [HttpGet("turnos")]
    public async Task<IActionResult> Turnos() =>
        Ok(await db.Turnos.OrderBy(t => t.LlegadaEn)
            .Select(t => new { t.Codigo, Paciente = t.Paciente.Nombre, Consultorio = t.Consultorio.Nombre, t.Estado, t.LlegadaEn })
            .ToListAsync());
}
