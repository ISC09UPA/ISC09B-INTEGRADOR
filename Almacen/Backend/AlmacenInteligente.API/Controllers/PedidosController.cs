using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Pedidos de reabastecimiento (botón Reordenar de la pestaña Alertas): solo admin.
// Crear manda un correo al proveedor; recibir registra la ENTRADA con origen PEDIDO.
[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/pedidos")]
public class PedidosController(IPedidoService servicio) : ApiControllerBase
{
    // POST api/pedidos — { "productoId": "PROD-001", "cantidad": 40 }
    // 201 con el pedido (correoEnviado dice si salió el correo) / 400 / 404 / 409 (ya hay uno en camino, sin proveedor o sin espacio)
    [HttpPost]
    public async Task<ActionResult<PedidoDto>> Crear(CrearPedidoDto dto, CancellationToken ct)
    {
        if (UsuarioIdActual() is not int usuarioId)
            return Unauthorized(new { error = "Necesitas iniciar sesión." });

        var resultado = await servicio.CrearAsync(dto, usuarioId, ct);
        return resultado.EsExito
            ? StatusCode(StatusCodes.Status201Created, resultado.Valor)
            : ErrorHttp(resultado);
    }

    // GET api/pedidos?estado=SOLICITADO&limite=50 — estado: SOLICITADO, RECIBIDO, CANCELADO u omitido (todos)
    [HttpGet]
    public async Task<ActionResult<List<PedidoDto>>> Listar(
        [FromQuery] string? estado, [FromQuery] int? limite, CancellationToken ct)
    {
        var resultado = await servicio.ListarAsync(estado, limite, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // PUT api/pedidos/7/recibir — cuerpo opcional { "cantidadRecibida": 40 }
    // 200 con { pedido, movimiento, producto, alerta } / 404 / 409 (no cabe o ya no está SOLICITADO)
    [HttpPut("{id:long}/recibir")]
    public async Task<ActionResult<PedidoRecibidoDto>> Recibir(
        long id, [FromBody] RecibirPedidoDto? dto, CancellationToken ct)
    {
        if (UsuarioIdActual() is not int usuarioId)
            return Unauthorized(new { error = "Necesitas iniciar sesión." });

        var resultado = await servicio.RecibirAsync(id, dto?.CantidadRecibida, usuarioId, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }

    // PUT api/pedidos/7/cancelar — 200 con el pedido / 404 / 409 (ya no está SOLICITADO)
    [HttpPut("{id:long}/cancelar")]
    public async Task<ActionResult<PedidoDto>> Cancelar(long id, CancellationToken ct)
    {
        var resultado = await servicio.CancelarAsync(id, ct);
        return resultado.EsExito ? Ok(resultado.Valor) : ErrorHttp(resultado);
    }
}
