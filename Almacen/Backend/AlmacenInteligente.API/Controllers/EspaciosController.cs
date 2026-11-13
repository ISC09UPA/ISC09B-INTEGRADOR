using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Consultar: cualquier usuario con sesión. Asignar producto, capacidad y tara: solo admin.
[ApiController]
[Authorize]
[Route("api/espacios")]
public class EspaciosController(IEspacioService servicio) : ApiControllerBase
{
    // GET api/espacios?anaquelId=A1
    [HttpGet]
    public async Task<ActionResult<List<EspacioDto>>> Listar([FromQuery] string? anaquelId, CancellationToken ct) =>
        Ok(await servicio.ListarAsync(anaquelId, ct));

    // PUT api/espacios/A1-E1 — { "productoId": "PROD-001", "capacidad": 20, "taraGramos": 150 } (admin)
    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<EspacioDto>> Actualizar(string id, ActualizarEspacioDto dto, CancellationToken ct)
    {
        var resultado = await servicio.ActualizarAsync(id, dto, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }
}
