using AlimentadorInteligente.API.Auth;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

/// <summary>Portada del panel de administración.</summary>
[ApiController]
[Authorize(Policy = RequisitoAdministrador.Politica)]
[Route("api/admin")]
public class AdminController(IAdminResumenService resumen) : ControllerBase
{
    [HttpGet("resumen")]
    public async Task<ActionResult<ResumenAdminDto>> Resumen(CancellationToken ct)
        => Ok(await resumen.ObtenerAsync(ct));
}
