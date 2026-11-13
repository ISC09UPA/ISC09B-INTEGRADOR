using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

public class ProductoService(IProductoRepository repositorio) : IProductoService
{
    private const string PrefijoId = "PROD-";
    private const int DiasSalidas = 30;

    public async Task<List<ProductoDto>> ListarAsync(CancellationToken ct = default)
    {
        var productos = await repositorio.ObtenerActivosAsync(ct);
        var ultimos = await repositorio.ObtenerUltimosMovimientosAsync(ct);
        var salidas = await repositorio.ObtenerSalidasDesdeAsync(InicioSalidas(), ct);

        return productos
            .Select(p => Mapear(p, ultimos.GetValueOrDefault(p.Id), salidas.GetValueOrDefault(p.Id)))
            .ToList();
    }

    public async Task<Resultado<ProductoDto>> ObtenerAsync(string id, CancellationToken ct = default)
    {
        var producto = await repositorio.ObtenerPorIdAsync(id, ct);
        if (producto is null || !producto.Activo)
            return Resultado<ProductoDto>.Falla(TipoError.NoEncontrado, $"No existe el producto {id}.");

        return Resultado<ProductoDto>.Exito(await ConstruirAsync(producto, ct));
    }

    public async Task<Resultado<ProductoDto>> CrearAsync(CrearProductoDto dto, CancellationToken ct = default)
    {
        var id = dto.Id?.Trim() ?? string.Empty;
        var nombre = dto.Nombre?.Trim() ?? string.Empty;
        var etiqueta = string.IsNullOrWhiteSpace(dto.EtiquetaVision) ? null : dto.EtiquetaVision.Trim();
        var descripcion = string.IsNullOrWhiteSpace(dto.Descripcion) ? null : dto.Descripcion.Trim();
        var imagenUrl = string.IsNullOrWhiteSpace(dto.ImagenUrl) ? null : dto.ImagenUrl.Trim();

        // Límites iguales a los de las columnas en db-almacen.
        if (id.Length > 20)
            return Resultado<ProductoDto>.Falla(TipoError.Validacion, "El id debe tener máximo 20 caracteres.");
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

        if (id.Length == 0)
            id = await GenerarIdAsync(ct);
        else if (await repositorio.ExisteAsync(id, ct))
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
        return Resultado<ProductoDto>.Exito(Mapear(producto, null, 0));
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
        return Resultado<ProductoDto>.Exito(await ConstruirAsync(producto, ct));
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

    private static DateTime InicioSalidas() => DateTime.UtcNow.AddDays(-DiasSalidas);

    // Producto con su último movimiento y sus salidas de 30 días (para detalle y respuestas de edición).
    private async Task<ProductoDto> ConstruirAsync(Producto producto, CancellationToken ct)
    {
        var ultimo = await repositorio.ObtenerUltimoMovimientoAsync(producto.Id, ct);
        var salidas = await repositorio.ObtenerSalidasProductoDesdeAsync(producto.Id, InicioSalidas(), ct);
        return Mapear(producto, ultimo, salidas);
    }

    // Siguiente id libre: PROD-001, PROD-002...
    private async Task<string> GenerarIdAsync(CancellationToken ct)
    {
        var ids = await repositorio.ObtenerIdsConPrefijoAsync(PrefijoId, ct);
        var mayor = ids
            .Select(i => int.TryParse(i[PrefijoId.Length..], out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();
        return $"{PrefijoId}{mayor + 1:000}";
    }

    private static ProductoDto Mapear(Producto p, Movimiento? ultimo, int salidas30Dias)
    {
        // Existencia total = suma de la existencia de sus espacios (sensor de peso).
        var espacios = p.Espacios.OrderBy(e => e.Id).ToList();
        var existencia = espacios.Sum(e => e.Existencia);
        int? capacidad = espacios.Count > 0 && espacios.All(e => e.Capacidad is not null)
            ? espacios.Sum(e => e.Capacidad!.Value)
            : null;
        var espacio = espacios.FirstOrDefault();

        return new ProductoDto(
            p.Id,
            p.Nombre,
            p.Descripcion,
            p.PesoUnitarioGramos,
            existencia,
            capacidad,
            p.PuntoReorden,
            existencia <= p.PuntoReorden,
            salidas30Dias,
            p.EtiquetaVision,
            p.ImagenUrl,
            espacio is null ? null : new UbicacionDto(espacio.AnaquelId, espacio.Id),
            ultimo is null ? null : new UltimoMovimientoDto(
                ultimo.TipoMovimiento,
                ultimo.Cantidad,
                DateTime.SpecifyKind(ultimo.FechaHora, DateTimeKind.Utc)));
    }
}
