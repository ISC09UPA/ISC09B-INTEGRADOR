using System.Net;
using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Pedidos de reabastecimiento (botón Reordenar de la app, solo admin).
//  - Crear: guarda el pedido y le manda un correo al proveedor (Azure Communication Services Email).
//    Si el correo falla, el pedido se queda creado con correoEnviado = false.
//  - Recibir: registra la ENTRADA con origen PEDIDO (misma regla de espacios y de reorden que un movimiento manual).
//  - Cancelar: solo cambia el estado.
public class PedidoService(
    IPedidoRepository pedidos,
    IProductoRepository productos,
    IProveedorRepository proveedores,
    IAlertaRepository alertas,
    IMovimientoRepository movimientos,
    IProductoService productoService,
    IServicioCorreo correo) : IPedidoService
{
    private const int LimitePorDefecto = 50;
    private const int LimiteMaximo = 200;

    public async Task<Resultado<PedidoDto>> CrearAsync(CrearPedidoDto dto, int usuarioId, CancellationToken ct = default)
    {
        var productoId = dto.ProductoId?.Trim() ?? string.Empty;
        if (productoId.Length == 0)
            return Falla<PedidoDto>(TipoError.Validacion, "El producto es obligatorio.");
        if (dto.Cantidad is <= 0 or > RepartoEspacios.CantidadMaxima)
            return Falla<PedidoDto>(TipoError.Validacion, $"La cantidad debe estar entre 1 y {RepartoEspacios.CantidadMaxima}.");

        var producto = await productos.ObtenerPorIdAsync(productoId, ct);
        if (producto is null || !producto.Activo)
            return Falla<PedidoDto>(TipoError.NoEncontrado, $"No existe el producto {productoId}.");

        // Sin espacio no se podría recibir: la entrada respondería 409 siempre.
        if (producto.Espacios.Count == 0)
            return Falla<PedidoDto>(TipoError.Conflicto, $"El producto {producto.Id} no tiene un espacio asignado: asígnale uno antes de pedirlo.");

        var proveedor = producto.ProveedorId is int proveedorId
            ? await proveedores.ObtenerPorIdAsync(proveedorId, ct)
            : null;
        if (proveedor is null)
            return Falla<PedidoDto>(TipoError.Conflicto, "El producto no tiene proveedor asignado.");

        if (await pedidos.ExisteSolicitadoAsync(producto.Id, ct))
            return Falla<PedidoDto>(TipoError.Conflicto, "Ya hay un pedido en camino para este producto.");

        // Si el producto tiene una alerta activa, el pedido se liga a ella.
        var activa = await alertas.ObtenerActivaAsync(producto.Id, ct);

        var pedido = new Pedido
        {
            ProductoId = producto.Id,
            ProveedorId = proveedor.Id,
            Cantidad = dto.Cantidad,
            Estado = EstadosPedido.Solicitado,
            CorreoEnviado = false,
            AlertaId = activa?.Id,
            UsuarioId = usuarioId,
            FechaSolicitud = DateTime.UtcNow
        };

        // Primero se guarda el pedido: si el correo falla, el pedido ya existe.
        pedidos.Agregar(pedido);
        await pedidos.GuardarCambiosAsync(ct);

        var (asunto, texto, html) = ArmarCorreo(pedido, producto, proveedor);
        if (await correo.EnviarAsync(proveedor.Email, asunto, texto, html, ct))
        {
            pedido.CorreoEnviado = true;
            await pedidos.GuardarCambiosAsync(ct);
        }

        var guardado = await pedidos.ObtenerPorIdAsync(pedido.Id, ct) ?? pedido;
        return Resultado<PedidoDto>.Exito(PedidoMapeo.Desde(guardado));
    }

    public async Task<Resultado<List<PedidoDto>>> ListarAsync(string? estado, int? limite, CancellationToken ct = default)
    {
        var filtro = string.IsNullOrWhiteSpace(estado) ? null : estado.Trim().ToUpperInvariant();
        if (filtro is not (null or EstadosPedido.Solicitado or EstadosPedido.Recibido or EstadosPedido.Cancelado))
            return Falla<List<PedidoDto>>(TipoError.Validacion, "El estado debe ser SOLICITADO, RECIBIDO o CANCELADO.");

        var tope = Math.Clamp(limite ?? LimitePorDefecto, 1, LimiteMaximo);
        var lista = await pedidos.ListarAsync(filtro, tope, ct);
        return Resultado<List<PedidoDto>>.Exito(lista.Select(PedidoMapeo.Desde).ToList());
    }

    public async Task<Resultado<PedidoRecibidoDto>> RecibirAsync(
        long id, int? cantidadRecibida, int usuarioId, CancellationToken ct = default)
    {
        var pedido = await pedidos.ObtenerPorIdAsync(id, ct);
        if (pedido is null)
            return Falla<PedidoRecibidoDto>(TipoError.NoEncontrado, $"No existe el pedido {id}.");
        if (pedido.Estado != EstadosPedido.Solicitado)
            return Falla<PedidoRecibidoDto>(TipoError.Conflicto, $"El pedido {id} ya está {pedido.Estado.ToLowerInvariant()}.");

        var cantidad = cantidadRecibida ?? pedido.Cantidad;
        if (cantidad is <= 0 or > RepartoEspacios.CantidadMaxima)
            return Falla<PedidoRecibidoDto>(TipoError.Validacion, $"La cantidad recibida debe estar entre 1 y {RepartoEspacios.CantidadMaxima}.");

        var producto = pedido.Producto;
        if (!producto.Activo)
            return Falla<PedidoRecibidoDto>(TipoError.Conflicto, $"El producto {producto.Id} ya se dio de baja: cancela el pedido.");

        var espacios = producto.Espacios.OrderBy(e => e.Id).ToList();
        if (espacios.Count == 0)
            return Falla<PedidoRecibidoDto>(TipoError.Conflicto, $"El producto {producto.Id} no tiene un espacio asignado en el anaquel.");

        // Si no cabe, no se guarda nada y el pedido sigue SOLICITADO.
        var error = RepartoEspacios.Entrada(espacios, cantidad);
        if (error is not null)
            return Falla<PedidoRecibidoDto>(TipoError.Conflicto, error);

        var ahora = DateTime.UtcNow;
        var movimiento = new Movimiento
        {
            ProductoId = producto.Id,
            TipoMovimiento = TiposMovimiento.Entrada,
            Cantidad = cantidad,
            Origen = OrigenesMovimiento.Pedido,
            UsuarioId = usuarioId,
            FechaHora = ahora
        };
        await movimientos.AgregarAsync(movimiento, ct);

        // Misma regla de reorden que los movimientos manuales y el sensor: normalmente atiende la alerta activa.
        var activa = await alertas.ObtenerActivaAsync(producto.Id, ct);
        var reorden = ReglaReorden.Evaluar(producto, espacios.Sum(e => e.Existencia), activa, ahora);
        if (reorden.Nueva is not null)
            alertas.Agregar(reorden.Nueva);

        pedido.Estado = EstadosPedido.Recibido;
        pedido.CantidadRecibida = cantidad;
        pedido.FechaRecepcion = ahora;

        // Un solo SaveChanges: entrada, existencia, alerta y pedido se guardan juntos.
        await pedidos.GuardarCambiosAsync(ct);

        var movimientoGuardado = await movimientos.ObtenerPorIdAsync(movimiento.Id, ct) ?? movimiento;
        var productoDto = await productoService.ObtenerAsync(producto.Id, ct);
        var alertaCambiada = reorden.Nueva ?? reorden.Atendida;

        return Resultado<PedidoRecibidoDto>.Exito(new PedidoRecibidoDto(
            PedidoMapeo.Desde(pedido),
            MovimientoMapeo.Desde(movimientoGuardado),
            productoDto.Valor!,
            alertaCambiada is null ? null : AlertaMapeo.Desde(alertaCambiada, producto.Nombre)));
    }

    public async Task<Resultado<PedidoDto>> CancelarAsync(long id, CancellationToken ct = default)
    {
        var pedido = await pedidos.ObtenerPorIdAsync(id, ct);
        if (pedido is null)
            return Falla<PedidoDto>(TipoError.NoEncontrado, $"No existe el pedido {id}.");
        if (pedido.Estado != EstadosPedido.Solicitado)
            return Falla<PedidoDto>(TipoError.Conflicto, $"El pedido {id} ya está {pedido.Estado.ToLowerInvariant()}.");

        pedido.Estado = EstadosPedido.Cancelado;
        await pedidos.GuardarCambiosAsync(ct);
        return Resultado<PedidoDto>.Exito(PedidoMapeo.Desde(pedido));
    }

    private static (string Asunto, string Texto, string Html) ArmarCorreo(Pedido pedido, Producto producto, Proveedor proveedor)
    {
        var asunto = $"Pedido de reabastecimiento #{pedido.Id}: {producto.Nombre}";
        var fecha = pedido.FechaSolicitud.ToString("yyyy-MM-dd HH:mm") + " UTC";

        var texto =
            $"Hola, {proveedor.Nombre}:\n\n" +
            "El Almacén Inteligente solicita el siguiente reabastecimiento:\n\n" +
            $"Pedido: #{pedido.Id}\n" +
            $"Producto: {producto.Nombre} ({producto.Id})\n" +
            $"Cantidad: {pedido.Cantidad} pieza(s)\n" +
            $"Fecha de solicitud: {fecha}\n\n" +
            "Gracias.\nAlmacén Inteligente";

        string H(string valor) => WebUtility.HtmlEncode(valor);
        var html =
            $"<p>Hola, {H(proveedor.Nombre)}:</p>" +
            "<p>El Almacén Inteligente solicita el siguiente reabastecimiento:</p>" +
            "<table cellpadding=\"6\" style=\"border-collapse:collapse\">" +
            $"<tr><td><b>Pedido</b></td><td>#{pedido.Id}</td></tr>" +
            $"<tr><td><b>Producto</b></td><td>{H(producto.Nombre)} ({H(producto.Id)})</td></tr>" +
            $"<tr><td><b>Cantidad</b></td><td>{pedido.Cantidad} pieza(s)</td></tr>" +
            $"<tr><td><b>Fecha de solicitud</b></td><td>{fecha}</td></tr>" +
            "</table><p>Gracias.<br>Almacén Inteligente</p>";

        return (asunto, texto, html);
    }

    private static Resultado<T> Falla<T>(TipoError tipo, string mensaje) => Resultado<T>.Falla(tipo, mensaje);
}
