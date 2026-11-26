using AlmacenInteligente.Application.Interfaces;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;

namespace AlmacenInteligente.Infrastructure.Fotos;

// Fotos de productos en Azure Blob Storage.
// Configuración (User Secrets en local, App Service → Variables de entorno en Azure):
//   Fotos:ConnectionString  cadena de conexión de la cuenta de Storage
//   Fotos:Contenedor        nombre del contenedor (por defecto "fotos-productos"; se crea si no existe, privado)
// Si falta la cadena, /productos/identificar y /productos/desde-foto responden 503.
public class ServicioFotosBlob(string? cadenaConexion, string? contenedor, ILogger<ServicioFotosBlob> log) : IServicioFotos
{
    private const string MetadatoEtiqueta = "etiqueta";
    private readonly string nombreContenedor = string.IsNullOrWhiteSpace(contenedor) ? "fotos-productos" : contenedor.Trim();
    private BlobContainerClient? cliente;
    private bool contenedorListo;

    public bool Configurado => !string.IsNullOrWhiteSpace(cadenaConexion);

    // Se crea al primer uso: una cadena mal escrita solo hace que falle la foto, no la API.
    private BlobContainerClient Cliente() => cliente ??= new BlobContainerClient(cadenaConexion, nombreContenedor);

    public async Task<string?> GuardarAsync(byte[] contenido, string tipoContenido, string? etiqueta, CancellationToken ct = default)
    {
        if (!Configurado) return null;
        try
        {
            var c = Cliente();
            if (!contenedorListo)
            {
                await c.CreateIfNotExistsAsync(cancellationToken: ct);
                contenedorListo = true;
            }

            var extension = tipoContenido == "image/png" ? "png" : "jpg";
            var blob = c.GetBlobClient($"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}.{extension}");
            var opciones = new BlobUploadOptions
            {
                HttpHeaders = new BlobHttpHeaders { ContentType = tipoContenido },
                Metadata = etiqueta is null ? null : new Dictionary<string, string> { [MetadatoEtiqueta] = etiqueta }
            };
            await blob.UploadAsync(BinaryData.FromBytes(contenido), opciones, ct);
            return blob.Uri.ToString();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogError(ex, "No se pudo guardar la foto en el contenedor {Contenedor}.", nombreContenedor);
            return null;
        }
    }

    public async Task<ConsultaFoto> ConsultarAsync(string url, CancellationToken ct = default)
    {
        if (!Configurado) return new ConsultaFoto(false, false, null);
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return new ConsultaFoto(true, false, null);

        try
        {
            // Solo se aceptan fotos de nuestra cuenta y nuestro contenedor.
            var c = Cliente();
            var partes = new BlobUriBuilder(uri);
            if (!string.Equals(uri.Host, c.Uri.Host, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(partes.BlobContainerName, c.Name, StringComparison.Ordinal)
                || string.IsNullOrEmpty(partes.BlobName))
                return new ConsultaFoto(true, false, null);

            var propiedades = await c.GetBlobClient(partes.BlobName).GetPropertiesAsync(cancellationToken: ct);
            propiedades.Value.Metadata.TryGetValue(MetadatoEtiqueta, out var etiqueta);
            return new ConsultaFoto(true, true, etiqueta);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return new ConsultaFoto(true, false, null);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogError(ex, "No se pudo consultar la foto {Url}.", url);
            return new ConsultaFoto(false, false, null);
        }
    }
}
