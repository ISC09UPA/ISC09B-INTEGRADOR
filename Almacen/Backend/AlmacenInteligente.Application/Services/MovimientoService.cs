using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Movimientos manuales (app) e historiales.
// Decisión del plan de entrega: el movimiento manual SÍ ajusta la existencia; la siguiente lectura del sensor la corrige.
// También revisa el punto de reorden con la misma regla que las lecturas del sensor (ReglaReorden).
public class MovimientoService(
    IMovimientoRepository movimientos,
    IProductoRepository productos,
    IProductoService productoService,
    IAlertaRepository alertas) : IMovimientoService
{
    private const int LimitePorDefecto = 50;
    private const int LimiteMaximo = 200;
    private const int CantidadMaxima = RepartoEspacios.CantidadMaxima;

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
            ? RepartoEspacios.Entrada(espacios, dto.Cantidad)
            : RepartoEspacios.Salida(espacios, dto.Cantidad);
        if (error is not null)
            return Falla(TipoError.Conflicto, error);

        var ahora = DateTime.UtcNow;
        var movimiento = new Movimiento
        {
            ProductoId = producto.Id,
            TipoMovimiento = tipo,
            Cantidad = dto.Cantidad,
            Origen = OrigenesMovimiento.Manual,
            UsuarioId = usuarioId,
            FechaHora = ahora
        };

        await movimientos.AgregarAsync(movimiento, ct);

        // Punto de reorden: crea la alerta si el producto llegó a él, o atiende la activa si ya se repuso.
        // "espacios" son todos los espacios del producto, ya con la existencia nueva.
        var activa = await alertas.ObtenerActivaAsync(producto.Id, ct);
        var reorden = ReglaReorden.Evaluar(producto, espacios.Sum(e => e.Existencia), activa, ahora);
        if (reorden.Nueva is not null)
            alertas.Agregar(reorden.Nueva);

        // Un solo SaveChanges: movimiento, existencia y alerta se guardan juntos (misma transacción).
        await movimientos.GuardarCambiosAsync(ct);

        var guardado = await movimientos.ObtenerPorIdAsync(movimiento.Id, ct) ?? movimiento;
        var productoDto = await productoService.ObtenerAsync(producto.Id, ct);
        var alertaCambiada = reorden.Nueva ?? reorden.Atendida;
        var alertaDto = alertaCambiada is null ? null : AlertaMapeo.Desde(alertaCambiada, producto.Nombre);

        return Resultado<MovimientoRegistradoDto>.Exito(
            new MovimientoRegistradoDto(Mapear(guardado), productoDto.Valor!, alertaDto));
    }

    public async Task<List<MovimientoDto>> ListarAsync(
        string? productoId, int? usuarioId, int? limite, CancellationToken ct = default)
    {
        var tope = Math.Clamp(limite ?? LimitePorDefecto, 1, LimiteMaximo);
        var filtroProducto = string.IsNullOrWhiteSpace(productoId) ? null : productoId.Trim();

        var lista = await movimientos.ListarAsync(filtroProducto, usuarioId, tope, ct);
        return lista.Select(Mapear).ToList();
    }

    private static Resultado<MovimientoRegistradoDto> Falla(TipoError tipo, string mensaje) =>
        Resultado<MovimientoRegistradoDto>.Falla(tipo, mensaje);

    private static MovimientoDto Mapear(Movimiento m) => MovimientoMapeo.Desde(m);
}
