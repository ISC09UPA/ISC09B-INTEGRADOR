using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

[ApiController]
[Authorize]
[Route("api/alimentadores")]
public class AlimentadoresController(IAlimentadorService alimentadores, IComandoService comandos) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AlimentadorDto>>> Listar(CancellationToken ct)
        => Ok(await alimentadores.ListarAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AlimentadorDto>> Obtener(int id, CancellationToken ct)
        => Ok(await alimentadores.ObtenerAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<AlimentadorDto>> Crear(CrearAlimentadorRequest request, CancellationToken ct)
    {
        var creado = await alimentadores.CrearAsync(request, ct);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AlimentadorDto>> Actualizar(int id, ActualizarAlimentadorRequest request, CancellationToken ct)
        => Ok(await alimentadores.ActualizarAsync(id, request, ct));

    // --- Usuarios y roles (RF-19) ---

    [HttpGet("{id:int}/miembros")]
    public async Task<ActionResult<IReadOnlyList<MiembroDto>>> ListarMiembros(int id, CancellationToken ct)
        => Ok(await alimentadores.ListarMiembrosAsync(id, ct));

    [HttpPost("{id:int}/miembros")]
    public async Task<ActionResult<MiembroDto>> AgregarMiembro(int id, AgregarMiembroRequest request, CancellationToken ct)
        => Ok(await alimentadores.AgregarMiembroAsync(id, request, ct));

    [HttpPut("{id:int}/miembros/{usuarioId:int}")]
    public async Task<IActionResult> CambiarRol(int id, int usuarioId, CambiarRolRequest request, CancellationToken ct)
    {
        await alimentadores.CambiarRolAsync(id, usuarioId, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}/miembros/{usuarioId:int}")]
    public async Task<IActionResult> QuitarMiembro(int id, int usuarioId, CancellationToken ct)
    {
        await alimentadores.QuitarMiembroAsync(id, usuarioId, ct);
        return NoContent();
    }

    // --- Comandos (RF-11) ---

    /// <summary>Dispensado manual. Responde 202: el resultado llega por SignalR (ComandoActualizado).</summary>
    [HttpPost("{id:int}/dispensar")]
    public async Task<ActionResult<ComandoDto>> Dispensar(int id, DispensarRequest request, CancellationToken ct)
        => Accepted(await comandos.DispensarAsync(id, request, ct));

    [HttpGet("{id:int}/comandos")]
    public async Task<ActionResult<IReadOnlyList<ComandoDto>>> ListarComandos(int id, CancellationToken ct)
        => Ok(await comandos.ListarAsync(id, ct));
}
