using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

public class ProductoService(IProductoRepository repositorio) : IProductoService
{
    public async Task<List<ProductoDto>> ListarAsync(CancellationToken ct = default)
    {
        var productos = await repositorio.ObtenerActivosAsync(ct);
        return productos.Select(p => Mapear(p, null)).ToList();
    }

    public async Task<Resultado<ProductoDto>> ObtenerAsync(string id, CancellationToken ct = default)
    {
        var producto = await repositorio.ObtenerPorIdAsync(id, ct);
        if (producto is null || !producto.Activo)
            return Resultado<ProductoDto>.Falla(TipoError.NoEncontrado, $"No existe el producto {id}.");

        var ultimo = await repositorio.ObtenerUltimoMovimientoAsync(id, ct);
        return Resultado<ProductoDto>.Exito(Mapear(producto, ultimo));
    }

    public async Task<Resultado<ProductoDto>> CrearAsync(CrearProductoDto dto, CancellationToken ct = default)
    {
        var id = dto.Id?.Trim() ?? string.Empty;
        var nombre = dto.Nombre?.Trim() ?? string.Empty;
        var etiqueta = string.IsNullOrWhiteSpace(dto.EtiquetaVision) ? null : dto.EtiquetaVision.Trim();
        var descripcion = string.IsNullOrWhiteSpace(dto.Descripcion) ? null : dto.Descripcion.Trim();
        var imagenUrl = string.IsNullOrWhiteSpace(dto.ImagenUrl) ? null : dto.ImagenUrl.Trim();

        // Límites iguales a los de las columnas en db-almacen.
        if (id.Length is 0 or > 20)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "El id es obligatorio y debe tener máximo 20 caracteres.");
        if (nombre.Length is 0 or > 100)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "El nombre es obligatorio y debe tener máximo 100 caracteres.");
        if (descripcion?.Length > 300)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "La descripción debe tener máximo 300 caracteres.");
        if (dto.PesoUnitarioGramos <= 0)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "El peso unitario debe ser mayor que 0.");
        if (dto.PuntoReorden < 0)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "El punto de reorden no puede ser negativo.");
        if (etiqueta?.Length > 50)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "La etiqueta de visión debe tener máximo 50 caracteres.");
        if (imagenUrl?.Length > 400)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "La URL de la imagen debe tener máximo 400 caracteres.");

        if (await repositorio.ExisteAsync(id, ct))
            return Resultado<ProductoDto>.Falla(TipoError.Conflicto, $"Ya existe un producto con el id {id}.");
        if (etiqueta is not null && await repositorio.EtiquetaEnUsoAsync(etiqueta, ct))
            return Resultado<ProductoDto>.Falla(TipoError.Conflicto, $"La etiqueta de visión '{etiqueta}' ya está asignada a otro producto.");

        var producto = new Producto
        {
            Id = id,
            Nombre = nombre,
            Descripcion = descripcion,
            PesoUnitarioGramos = dto.PesoUnitarioGramos,
            PuntoReorden = dto.PuntoReorden,
            EtiquetaVision = etiqueta,
            ImagenUrl = imagenUrl,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        await repositorio.AgregarAsync(producto, ct);
        await repositorio.GuardarCambiosAsync(ct);
        return Resultado<ProductoDto>.Exito(Mapear(producto, null));
    }

    public async Task<Resultado<ProductoDto>> ActualizarReordenAsync(string id, int puntoReorden, CancellationToken ct = default)
    {
        if (puntoReorden < 0)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "El punto de reorden no puede ser negativo.");

        var producto = await repositorio.ObtenerPorIdAsync(id, ct);
        if (producto is null || !producto.Activo)
            return Resultado<ProductoDto>.Falla(TipoError.NoEncontrado, $"No existe el producto {id}.");

        producto.PuntoReorden = puntoReorden;
        await repositorio.GuardarCambiosAsync(ct);
        return Resultado<ProductoDto>.Exito(Mapear(producto, null));
    }

    public async Task<Resultado<bool>> DarDeBajaAsync(string id, CancellationToken ct = default)
    {
        var producto = await repositorio.ObtenerPorIdAsync(id, ct);
        if (producto is null || !producto.Activo)
            return Resultado<bool>.Falla(TipoError.NoEncontrado, $"No existe el producto {id}.");

        producto.Activo = false; // baja lógica: se conserva el historial
        await repositorio.GuardarCambiosAsync(ct);
        return Resultado<bool>.Exito(true);
    }

    private static ProductoDto Mapear(Producto p, Movimiento? ultimo)
    {
        // Existencia total = suma de la existencia de sus espacios (sensor de peso).
        var existencia = p.Espacios.Sum(e => e.Existencia);
        var espacio = p.Espacios.OrderBy(e => e.Id).FirstOrDefault();

        return new ProductoDto(
            p.Id,
            p.Nombre,
            p.Descripcion,
            p.PesoUnitarioGramos,
            existencia,
            p.PuntoReorden,
            existencia <= p.PuntoReorden,
            p.EtiquetaVision,
            p.ImagenUrl,
            espacio is null ? null : new UbicacionDto(espacio.AnaquelId, espacio.Id),
            ultimo is null ? null : new UltimoMovimientoDto(
                ultimo.TipoMovimiento,
                ultimo.Cantidad,
                DateTime.SpecifyKind(ultimo.FechaHora, DateTimeKind.Utc)));
    }
}
