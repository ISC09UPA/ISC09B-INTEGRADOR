using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;

namespace AlmacenInteligente.Application.Services;

// Identificar un producto por foto (Blob Storage + Azure Vision) y registrar uno nuevo desde la foto.
// La coincidencia es por la etiqueta de Vision: si una etiqueta de la foto (con confianza >= umbral) es igual a la
// etiquetaVision de un producto activo, ese es el producto. Por eso cada producto de la maqueta necesita su
// etiquetaVision (en inglés, como la devuelve Vision: "screw", "bottle", "battery"...).
public class FotoProductoService(
    IServicioVision vision,
    IServicioFotos fotos,
    IProductoRepository productos,
    IProductoService productoService) : IFotoProductoService
{
    public const int TamanoMaximo = 4 * 1024 * 1024; // 4 MB (contrato 3.5)
    private const int LargoMaximoEtiqueta = 50;      // igual que la columna EtiquetaVision

    public async Task<Resultado<IdentificacionDto>> IdentificarAsync(byte[] foto, CancellationToken ct = default)
    {
        if (foto.Length == 0)
            return Falla<IdentificacionDto>(TipoError.Validacion, "La foto está vacía.");
        if (foto.Length > TamanoMaximo)
            return Falla<IdentificacionDto>(TipoError.Validacion, "La foto debe pesar máximo 4 MB.");

        var tipo = TipoImagen(foto);
        if (tipo is null)
            return Falla<IdentificacionDto>(TipoError.Validacion, "La foto debe ser JPG o PNG.");

        if (!vision.Configurado || !fotos.Configurado)
            return Falla<IdentificacionDto>(TipoError.ServicioNoDisponible, "La identificación por foto no está configurada en el servidor.");

        var etiquetas = await vision.ObtenerEtiquetasAsync(foto, ct);
        if (etiquetas is null)
            return Falla<IdentificacionDto>(TipoError.ServicioNoDisponible, "No se pudo identificar la foto con Azure Vision. Intenta más tarde.");

        var ordenadas = etiquetas.OrderByDescending(e => e.Confianza).ToList();
        var candidatas = ordenadas.Where(e => e.Confianza >= vision.UmbralConfianza).ToList();

        // Producto activo cuya etiquetaVision coincide con la etiqueta más confiable posible.
        List<Domain.Entities.Producto> conEtiqueta = candidatas.Count == 0
            ? new()
            : await productos.ObtenerActivosPorEtiquetasAsync(candidatas.Select(e => e.Nombre).ToList(), ct);
        EtiquetaDetectada? coincidencia = null;
        string? productoId = null;
        foreach (var candidata in candidatas)
        {
            var producto = conEtiqueta.FirstOrDefault(p =>
                string.Equals(p.EtiquetaVision, candidata.Nombre, StringComparison.OrdinalIgnoreCase));
            if (producto is null) continue;
            coincidencia = candidata;
            productoId = producto.Id;
            break;
        }

        // Si no se reconoció, se guarda con la foto la etiqueta libre más probable, para asignársela al producto
        // nuevo en desde-foto: así la siguiente foto del mismo producto ya lo reconoce.
        string? etiquetaParaAlta = null;
        if (coincidencia is null)
        {
            foreach (var candidata in candidatas)
            {
                var nombre = candidata.Nombre.Trim();
                if (nombre.Length is 0 or > LargoMaximoEtiqueta || !EsAscii(nombre)) continue;
                if (await productos.EtiquetaEnUsoAsync(nombre, ct)) continue;
                etiquetaParaAlta = nombre;
                break;
            }
        }

        var imagenUrl = await fotos.GuardarAsync(foto, tipo, etiquetaParaAlta, ct);
        if (imagenUrl is null)
            return Falla<IdentificacionDto>(TipoError.ServicioNoDisponible, "No se pudo guardar la foto en Azure Storage. Intenta más tarde.");

        ProductoDto? productoDto = null;
        if (productoId is not null)
        {
            var obtenido = await productoService.ObtenerAsync(productoId, ct);
            productoDto = obtenido.Valor;
        }

        var principal = coincidencia ?? ordenadas.FirstOrDefault();
        return Resultado<IdentificacionDto>.Exito(new IdentificacionDto(
            productoDto is not null,
            Math.Round(principal?.Confianza ?? 0, 3),
            principal?.Nombre,
            productoDto,
            imagenUrl));
    }

    public async Task<Resultado<ProductoDto>> CrearDesdeFotoAsync(CrearDesdeFotoDto dto, CancellationToken ct = default)
    {
        var imagenUrl = dto.ImagenUrl?.Trim() ?? string.Empty;
        if (imagenUrl.Length == 0)
            return Falla<ProductoDto>(TipoError.Validacion, "La imagenUrl es obligatoria: usa la que devolvió /productos/identificar.");
        if (!fotos.Configurado)
            return Falla<ProductoDto>(TipoError.ServicioNoDisponible, "La identificación por foto no está configurada en el servidor.");

        var consulta = await fotos.ConsultarAsync(imagenUrl, ct);
        if (!consulta.Ok)
            return Falla<ProductoDto>(TipoError.ServicioNoDisponible, "No se pudo revisar la foto en Azure Storage. Intenta más tarde.");
        if (!consulta.Existe)
            return Falla<ProductoDto>(TipoError.Validacion, "La imagenUrl no es una foto de /productos/identificar.");

        // La etiqueta pudo haberse asignado a otro producto entre la foto y el alta.
        var etiqueta = consulta.Etiqueta;
        if (etiqueta is not null && await productos.EtiquetaEnUsoAsync(etiqueta, ct))
            etiqueta = null;

        // Mismas validaciones que el alta normal. No se asigna espacio: lo hace un admin después (contrato 4.1).
        return await productoService.CrearAsync(
            new CrearProductoDto(null, dto.Nombre, dto.Descripcion, dto.PesoUnitarioGramos, dto.PuntoReorden, etiqueta, imagenUrl),
            ct);
    }

    // Tipo real del archivo por sus primeros bytes (no se confía en el nombre ni en el Content-Type).
    private static string? TipoImagen(byte[] b)
    {
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return "image/png";
        return null;
    }

    // Los metadatos de un blob solo aceptan ASCII.
    private static bool EsAscii(string texto) => texto.All(c => c is >= ' ' and <= '~');

    private static Resultado<T> Falla<T>(TipoError tipo, string mensaje) => Resultado<T>.Falla(tipo, mensaje);
}
