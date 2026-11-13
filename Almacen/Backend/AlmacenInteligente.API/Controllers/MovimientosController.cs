using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Registro manual: admin u operador. Historial general: solo admin.
[ApiController]
[Authorize]
[Route("api/movimientos")]
public class MovimientosController(IMovimientoService servicio) : ApiControllerBase
{
    // POST api/movimientos — { "productoId": "PROD-001", "tipoMovimiento": "SALIDA", "cantidad": 2 }
    // 201 con { movimiento, producto } / 400 / 404 / 409 (sin espacio, sin existencia o no cabe)
    [HttpPost]
    public async Task<ActionResult<MovimientoRegistradoDto>> Registrar(RegistrarMovimientoDto dto, CancellationToken ct)
    {
        if (UsuarioIdActual() is not int usuarioId)
            return Unauthorized(new { error = "Necesitas iniciar sesión." });

        var resultado = await servicio.RegistrarManualAsync(dto, usuarioId, ct);
        return resultado.EsExito
            ? StatusCode(StatusCodes.Status201Created, resultado.Valor)
            : ErrorHttp(resultado);
    }

    // GET api/movimientos/mios?productoId=PROD-001&limite=50 — historial del usuario de la sesión
    [HttpGet("mios")]
    public async Task<ActionResult<List<MovimientoDto>>> MiHistorial(
        [FromQuery] string? productoId, [FromQuery] int? limite, CancellationToken ct)
    {
        if (UsuarioIdActual() is not int usuarioId)
            return Unauthorized(new { error = "Necesitas iniciar sesión." });

        return Ok(await servicio.ListarAsync(productoId, usuarioId, limite, ct));
    }

    // GET api/movimientos?productoId=PROD-001&usuarioId=2&limite=50 — historial general (admin), incluye sensor y cámara
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<List<MovimientoDto>>> Historial(
        [FromQuery] string? productoId, [FromQuery] int? usuarioId, [FromQuery] int? limite, CancellationToken ct) =>
        Ok(await servicio.ListarAsync(productoId, usuarioId, limite, ct));
}
