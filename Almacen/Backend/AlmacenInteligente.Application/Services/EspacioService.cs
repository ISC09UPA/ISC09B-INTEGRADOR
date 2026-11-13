using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Espacios del anaquel: qué producto tiene cada uno, su capacidad y su tara.
public class EspacioService(IEspacioRepository espacios, IProductoRepository productos) : IEspacioService
{
    public async Task<List<EspacioDto>> ListarAsync(string? anaquelId, CancellationToken ct = default)
    {
        var filtro = string.IsNullOrWhiteSpace(anaquelId) ? null : anaquelId.Trim();
        var lista = await espacios.ListarAsync(filtro, ct);
        return lista.Select(Mapear).ToList();
    }

    public async Task<Resultado<EspacioDto>> ActualizarAsync(string id, ActualizarEspacioDto dto, CancellationToken ct = default)
    {
        if (dto.Capacidad is <= 0)
            return Falla(TipoError.Validacion, "La capacidad debe ser mayor que 0 (o null para sin límite).");
        if (dto.TaraGramos is < 0)
            return Falla(TipoError.Validacion, "La tara no puede ser negativa.");

        var espacio = await espacios.ObtenerPorIdAsync(id, ct);
        if (espacio is null)
            return Falla(TipoError.NoEncontrado, $"No existe el espacio {id}.");

        Producto? producto = null;
        if (!string.IsNullOrWhiteSpace(dto.ProductoId))
        {
            var productoId = dto.ProductoId.Trim();
            producto = await productos.ObtenerPorIdAsync(productoId, ct);
            if (producto is null || !producto.Activo)
                return Falla(TipoError.NoEncontrado, $"No existe el producto {productoId}.");
        }

        var cambiaProducto = !string.Equals(producto?.Id, espacio.ProductoId, StringComparison.OrdinalIgnoreCase);
        if (cambiaProducto && espacio.Existencia > 0)
            return Falla(TipoError.Conflicto,
                $"El espacio {espacio.Id} todavía tiene {espacio.Existencia} pieza(s) de {espacio.ProductoId}. Regístralas como salida antes de cambiar el producto.");
        if (dto.Capacidad is int cap && cap < espacio.Existencia)
            return Falla(TipoError.Conflicto,
                $"La capacidad no puede ser menor que la existencia actual ({espacio.Existencia}).");

        espacio.ProductoId = producto?.Id;
        espacio.Producto = producto;
        espacio.Capacidad = dto.Capacidad;
        if (dto.TaraGramos is int tara)
            espacio.TaraGramos = tara;

        await espacios.GuardarCambiosAsync(ct);
        return Resultado<EspacioDto>.Exito(Mapear(espacio));
    }

    private static Resultado<EspacioDto> Falla(TipoError tipo, string mensaje) =>
        Resultado<EspacioDto>.Falla(tipo, mensaje);

    private static EspacioDto Mapear(Espacio e) => new(
        e.Id,
        e.AnaquelId,
        e.ProductoId,
        e.Producto?.Nombre,
        e.Existencia,
        e.Capacidad,
        e.TaraGramos,
        e.UltimaLectura is DateTime f ? DateTime.SpecifyKind(f, DateTimeKind.Utc) : null);
}
