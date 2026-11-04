using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Rutas acordadas en plan-azure-almacen.md. Falta proteger por rol cuando exista /auth/login.
[ApiController]
[Route("api/productos")]
public class ProductosController(IProductoService servicio) : ControllerBase
{
    // GET api/productos — lista con existencia y ubicación
    [HttpGet]
    public async Task<ActionResult<List<ProductoDto>>> Listar(CancellationToken ct) =>
        Ok(await servicio.ListarAsync(ct));

    // GET api/productos/PROD-001 — detalle + último movimiento
    [HttpGet("{id}")]
    public async Task<ActionResult<ProductoDto>> Obtener(string id, CancellationToken ct)
    {
        var resultado = await servicio.ObtenerAsync(id, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // POST api/productos — alta (admin)
    [HttpPost]
    public async Task<ActionResult<ProductoDto>> Crear(CrearProductoDto dto, CancellationToken ct)
    {
        var resultado = await servicio.CrearAsync(dto, ct);
        return resultado.EsExito
            ? CreatedAtAction(nameof(Obtener), new { id = resultado.Valor!.Id }, resultado.Valor)
            : ErrorHttp(resultado);
    }

    // PUT api/productos/PROD-001/reorden — { "puntoReorden": 6 } (admin)
    [HttpPut("{id}/reorden")]
    public async Task<ActionResult<ProductoDto>> ActualizarReorden(string id, ActualizarReordenDto dto, CancellationToken ct)
    {
        var resultado = await servicio.ActualizarReordenAsync(id, dto.PuntoReorden, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // DELETE api/productos/PROD-001 — baja lógica (admin)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DarDeBaja(string id, CancellationToken ct)
    {
        var resultado = await servicio.DarDeBajaAsync(id, ct);
        return resultado.EsExito ? NoContent() : ErrorHttp(resultado);
    }

    // Errores con el formato acordado: { "error": "mensaje legible" }
    private ObjectResult ErrorHttp<T>(Resultado<T> resultado)
    {
        var cuerpo = new { error = resultado.Error };
        return resultado.TipoError switch
        {
            TipoError.Validacion => BadRequest(cuerpo),
            TipoError.NoEncontrado => NotFound(cuerpo),
            TipoError.Conflicto => Conflict(cuerpo),
            _ => StatusCode(StatusCodes.Status500InternalServerError, cuerpo)
        };
    }
}
