using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Movimientos manuales (app) e historiales.
// Decisión del plan de entrega: el movimiento manual SÍ ajusta la existencia; la siguiente lectura del sensor la corrige.
public class MovimientoService(
    IMovimientoRepository movimientos,
    IProductoRepository productos,
    IProductoService productoService) : IMovimientoService
{
    private const int LimitePorDefecto = 50;
    private const int LimiteMaximo = 200;
    private const int CantidadMaxima = 10_000;

    public async Task<Resultado<MovimientoRegistradoDto>> RegistrarManualAsync(
        RegistrarMovimientoDto dto, int usuarioId, CancellationToken ct = default)
    {
        var productoId = dto.ProductoId?.Trim() ?? string.Empty;
        var tipo = dto.TipoMovimiento?.Trim().ToUpperInvariant() ?? string.Empty;

        if (productoId.Length == 0)
            return Falla(TipoError.Validacion, "El producto es obligatorio.");
        if (tipo is not (TiposMovimiento.Entrada or TiposMovimiento.Salida))
            return Falla(TipoError.Validacion, "El tipo de movimiento debe ser ENTRADA o SALIDA.");
        if (dto.Cantidad is <= 0 or > CantidadMaxima)
            return Falla(TipoError.Validacion, $"La cantidad debe estar entre 1 y {CantidadMaxima}.");

        var producto = await productos.ObtenerPorIdAsync(productoId, ct);
        if (producto is null || !producto.Activo)
            return Falla(TipoError.NoEncontrado, $"No existe el producto {productoId}.");

        var espacios = producto.Espacios.OrderBy(e => e.Id).ToList();
        if (espacios.Count == 0)
            return Falla(TipoError.Conflicto, $"El producto {producto.Id} no tiene un espacio asignado en el anaquel.");

        var error = tipo == TiposMovimiento.Entrada
            ? RepartirEntrada(espacios, dto.Cantidad)
            : RepartirSalida(espacios, dto.Cantidad);
        if (error is not null)
            return Falla(TipoError.Conflicto, error);

        var movimiento = new Movimiento
        {
            ProductoId = producto.Id,
            TipoMovimiento = tipo,
            Cantidad = dto.Cantidad,
            Origen = OrigenesMovimiento.Manual,
            UsuarioId = usuarioId,
            FechaHora = DateTime.UtcNow
        };

        await movimientos.AgregarAsync(movimiento, ct);
        // Un solo SaveChanges: el movimiento y la nueva existencia se guardan juntos (misma transacción).
        await movimientos.GuardarCambiosAsync(ct);

        var guardado = await movimientos.ObtenerPorIdAsync(movimiento.Id, ct) ?? movimiento;
        var productoDto = await productoService.ObtenerAsync(producto.Id, ct);

        return Resultado<MovimientoRegistradoDto>.Exito(
            new MovimientoRegistradoDto(Mapear(guardado), productoDto.Valor!));
    }

    public async Task<List<MovimientoDto>> ListarAsync(
        string? productoId, int? usuarioId, int? limite, CancellationToken ct = default)
    {
        var tope = Math.Clamp(limite ?? LimitePorDefecto, 1, LimiteMaximo);
        var filtroProducto = string.IsNullOrWhiteSpace(productoId) ? null : productoId.Trim();

        var lista = await movimientos.ListarAsync(filtroProducto, usuarioId, tope, ct);
        return lista.Select(Mapear).ToList();
    }

    // Llena los espacios en orden sin pasar su capacidad (null = sin límite). Devuelve el error o null.
    private static string? RepartirEntrada(List<Espacio> espacios, int cantidad)
    {
        long libre = 0;
        foreach (var e in espacios)
            libre += e.Capacidad is int cap ? Math.Max(0, cap - e.Existencia) : CantidadMaxima;

        if (libre < cantidad)
            return $"No cabe: solo hay lugar para {libre} pieza(s) más.";

        var pendiente = cantidad;
        foreach (var e in espacios)
        {
            if (pendiente == 0) break;
            var lugar = e.Capacidad is int cap ? Math.Max(0, cap - e.Existencia) : pendiente;
            var poner = Math.Min(lugar, pendiente);
            e.Existencia += poner;
            pendiente -= poner;
        }
        return null;
    }

    // Saca de los espacios en orden. Devuelve el error o null.
    private static string? RepartirSalida(List<Espacio> espacios, int cantidad)
    {
        var total = espacios.Sum(e => e.Existencia);
        if (total < cantidad)
            return $"No hay suficiente existencia: solo hay {total} pieza(s).";

        var pendiente = cantidad;
        foreach (var e in espacios)
        {
            if (pendiente == 0) break;
            var quitar = Math.Min(e.Existencia, pendiente);
            e.Existencia -= quitar;
            pendiente -= quitar;
        }
        return null;
    }

    private static Resultado<MovimientoRegistradoDto> Falla(TipoError tipo, string mensaje) =>
        Resultado<MovimientoRegistradoDto>.Falla(tipo, mensaje);

    private static MovimientoDto Mapear(Movimiento m) => new(
        m.Id,
        m.ProductoId,
        m.Producto?.Nombre ?? string.Empty,
        m.TipoMovimiento,
        m.Cantidad,
        m.Origen,
        m.UsuarioId,
        m.Usuario?.Nombre,
        DateTime.SpecifyKind(m.FechaHora, DateTimeKind.Utc));
}
