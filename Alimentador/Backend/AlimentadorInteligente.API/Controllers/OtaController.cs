using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

[ApiController]
[Authorize]
[Route("api/ota")]
public class OtaController(IComandoService comandos) : ControllerBase
{
    /// <summary>Versiones de firmware y modelo disponibles.</summary>
    [HttpGet("artefactos")]
    public async Task<ActionResult<IReadOnlyList<ArtefactoOtaDto>>> Artefactos(CancellationToken ct)
        => Ok(await comandos.ListarArtefactosAsync(ct));
}
