using AlimentadorInteligente.Application.Abstractions;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;

namespace AlimentadorInteligente.Infrastructure.Storage;

/// <summary>Genera URLs SAS para que la Pi suba fotos y el ESP32 descargue OTA sin exponer la cuenta.</summary>
public class BlobStorageService(BlobServiceClient cliente) : IAlmacenamientoArchivos
{
    public Uri GenerarUrlSubida(string contenedor, string blobNombre, TimeSpan vigencia)
        => GenerarSas(contenedor, blobNombre, vigencia, BlobSasPermissions.Create | BlobSasPermissions.Write);

    public Uri GenerarUrlDescarga(string contenedor, string blobNombre, TimeSpan vigencia)
        => GenerarSas(contenedor, blobNombre, vigencia, BlobSasPermissions.Read);

    private Uri GenerarSas(string contenedor, string blobNombre, TimeSpan vigencia, BlobSasPermissions permisos)
    {
        var blob = cliente.GetBlobContainerClient(contenedor).GetBlobClient(blobNombre);
        if (!blob.CanGenerateSasUri)
            throw new InvalidOperationException("La conexión a Blob Storage debe usar una clave de cuenta para generar SAS.");
        return blob.GenerateSasUri(permisos, DateTimeOffset.UtcNow.Add(vigencia));
    }
}
