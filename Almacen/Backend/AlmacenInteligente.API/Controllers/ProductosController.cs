using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Application.Services;
using AlmacenInteligente.Domain.Constantes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Rutas acordadas en plan-azure-almacen.md. Consultar: cualquier usuario con sesión (admin u operador).
// Alta, reorden y baja: solo admin.
[ApiController]
[Authorize]
[Route("api/productos")]
public class ProductosController(IProductoService servicio, IFotoProductoService fotos) : ApiControllerBase
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
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ProductoDto>> Crear(CrearProductoDto dto, CancellationToken ct)
    {
        var resultado = await servicio.CrearAsync(dto, ct);
        return resultado.EsExito
            ? CreatedAtAction(nameof(Obtener), new { id = resultado.Valor!.Id }, resultado.Valor)
            : ErrorHttp(resultado);
    }

    // PUT api/productos/PROD-001/reorden — { "puntoReorden": 6 } (admin)
    [HttpPut("{id}/reorden")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ProductoDto>> ActualizarReorden(string id, ActualizarReordenDto dto, CancellationToken ct)
    {
        var resultado = await servicio.ActualizarReordenAsync(id, dto.PuntoReorden, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // DELETE api/productos/PROD-001 — baja lógica (admin)
    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DarDeBaja(string id, CancellationToken ct)
    {
        var resultado = await servicio.DarDeBajaAsync(id, ct);
        return resultado.EsExito ? NoContent() : ErrorHttp(resultado);
    }

    // POST api/productos/identificar — multipart/form-data, campo "foto" (JPG o PNG, máx. 4 MB). Admin y operador.
    // Guarda la foto en Blob Storage y la identifica con Azure Vision (contrato 3.5).
    [HttpPost("identificar")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<IdentificacionDto>> Identificar([FromForm] IFormFile? foto, CancellationToken ct)
    {
        if (foto is null || foto.Length == 0)
            return BadRequest(new { error = "Falta la foto: mándala en el campo 'foto' (multipart/form-data)." });
        if (foto.Length > FotoProductoService.TamanoMaximo)
            return BadRequest(new { error = "La foto debe pesar máximo 4 MB." });

        using var memoria = new MemoryStream();
        await foto.CopyToAsync(memoria, ct);
        var resultado = await fotos.IdentificarAsync(memoria.ToArray(), ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // POST api/productos/desde-foto — { imagenUrl, nombre, pesoUnitarioGramos, puntoReorden, descripcion? }. Admin y operador.
    // Única forma en que el operador da de alta productos. Queda sin espacio (un admin se lo asigna después).
    [HttpPost("desde-foto")]
    public async Task<ActionResult<ProductoDto>> CrearDesdeFoto(CrearDesdeFotoDto dto, CancellationToken ct)
    {
        var resultado = await fotos.CrearDesdeFotoAsync(dto, ct);
        return resultado.EsExito
            ? CreatedAtAction(nameof(Obtener), new { id = resultado.Valor!.Id }, resultado.Valor)
            : ErrorHttp(resultado);
    }
}
