using CasaDomotica.API.Services;
using CasaDomotica.Application;
using CasaDomotica.Domain;
using CasaDomotica.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CasaDomotica.API.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class AccesosController : ControllerBase
{
    private readonly CasaDb _db;
    private readonly PuertaEstado _puerta;

    public AccesosController(CasaDb db, PuertaEstado puerta)
    {
        _db = db;
        _puerta = puerta;
    }

    private Task<List<string>> NombresAsync() =>
        _db.Personas.AsNoTracking().OrderBy(p => p.Id).Select(p => p.Nombre).ToListAsync();

    [HttpGet("accesos")]
    public async Task<IActionResult> Listar()
    {
        var personas = await NombresAsync();
        var historial = await _db.Accesos.AsNoTracking()
            .OrderByDescending(x => x.Id)
            .Take(60)
            .Select(x => new Registro(x.Mensaje, x.Hora))
            .ToListAsync();
        return Ok(new { personas, historial });
    }

    [HttpGet("alertas")]
    public async Task<IActionResult> Alertas()
    {
        var alertas = await _db.Alertas.AsNoTracking()
            .OrderByDescending(x => x.Id)
            .Take(60)
            .Select(x => new Registro(x.Mensaje, x.Hora))
            .ToListAsync();
        return Ok(alertas);
    }

    [HttpPost("accesos/personas")]
    public async Task<IActionResult> Agregar([FromBody] PersonaDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.Nombre))
        {
            await _db.AsegurarPersonaAsync(dto.Nombre);
        }

        return Ok(await NombresAsync());
    }

    [HttpDelete("accesos/personas/{nombre}")]
    public async Task<IActionResult> Quitar(string nombre)
    {
        var n = nombre.Trim().ToLower();
        var borrar = await _db.Personas.Where(p => p.Nombre.ToLower() == n).ToListAsync();
        if (borrar.Count > 0)
        {
            _db.Personas.RemoveRange(borrar);
            await _db.SaveChangesAsync();
        }

        return Ok(await NombresAsync());
    }

    /// <summary>
    /// Abrir la puerta desde la app. El servo está en la Raspberry: aquí queda una orden de 15 s que
    /// la Raspberry recoge en su siguiente consulta (GET api/raspberry/estado).
    /// </summary>
    [HttpPost("accesos/abrir")]
    public async Task<IActionResult> Abrir()
    {
        _db.Accesos.Add(new AccesoLog { Mensaje = "Puerta abierta desde la app", Hora = DateTime.Now });
        await _db.SaveChangesAsync();
        _puerta.PedirAbrir();
        return Ok(new { raspberry = _puerta.RaspberryEnLinea });
    }
}
