using CasaDomotica.API.Services;
using CasaDomotica.Application;
using CasaDomotica.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CasaDomotica.API.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class PanelController : ControllerBase
{
    private readonly CasaDb _db;
    private readonly PuertaEstado _puerta;

    public PanelController(CasaDb db, PuertaEstado puerta)
    {
        _db = db;
        _puerta = puerta;
    }

    [HttpGet("panel")]
    public async Task<IActionResult> Panel()
    {
        var ajustes = await _db.Ajustes.AsNoTracking().FirstAsync();
        var luces = await _db.Luces.AsNoTracking().ToDictionaryAsync(l => l.Nombre, l => l.Encendida);
        var clima = await _db.Clima.AsNoTracking().ToDictionaryAsync(c => c.Zona, c => new ClimaZona(c.Temp, c.Hum));

        return Ok(new
        {
            seguridad = ajustes.SeguridadActiva,
            puerta = _puerta.Abierta,
            lux = ajustes.Lux,
            luces,
            clima,
            raspberry = _puerta.RaspberryEnLinea
        });
    }

    [HttpPost("luces/{id}")]
    public async Task<IActionResult> Luz(string id, [FromBody] LuzDto dto)
    {
        var luz = await _db.Luces.FirstOrDefaultAsync(l => l.Nombre == id);
        if (luz is null)
        {
            return NotFound(new { mensaje = "Esa luz no existe." });
        }

        luz.Encendida = dto.Encendida;
        await _db.SaveChangesAsync();
        return Ok(await _db.Luces.AsNoTracking().ToDictionaryAsync(l => l.Nombre, l => l.Encendida));
    }

    [HttpPost("seguridad")]
    public async Task<IActionResult> Seguridad([FromBody] SeguridadDto dto)
    {
        var ajustes = await _db.Ajustes.FirstAsync();
        ajustes.SeguridadActiva = dto.Activa;
        await _db.SaveChangesAsync();
        return Ok(new { activa = ajustes.SeguridadActiva });
    }
}
