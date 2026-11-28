using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;

public sealed class BlobStorageService : IBlobStorageService
{
    private readonly BlobContainerClient _container;

    public BlobStorageService(IOptions<BlobStorageOptions> options)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ConnectionString) || string.IsNullOrWhiteSpace(settings.ContainerName))
            throw new InvalidOperationException("Configure AzureBlob:ConnectionString y AzureBlob:ContainerName.");
        _container = new BlobContainerClient(settings.ConnectionString, settings.ContainerName);
    }

    public async Task<string> UploadPhotoAsync(Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            throw new ArgumentException("Formato no permitido. Usa JPG, PNG o WEBP.", nameof(fileName));

        await _container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
        var blobName = $"{Guid.NewGuid():N}{extension}";
        var blob = _container.GetBlobClient(blobName);
        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType }
        };
        await blob.UploadAsync(content, options, ct);
        return blobName;
    }

    public async Task<bool> ExistsAsync(string blobName, CancellationToken ct = default) =>
        (await _container.GetBlobClient(blobName).ExistsAsync(ct)).Value;

    public async Task<Stream> OpenReadAsync(string blobName, CancellationToken ct = default) =>
        await _container.GetBlobClient(blobName).OpenReadAsync(cancellationToken: ct);

    public async Task<BlobPhotoInfo?> GetLatestPhotoAsync(CancellationToken ct = default)
    {
        BlobPhotoInfo? latest = null;

        await foreach (var item in _container.GetBlobsAsync(
            traits: BlobTraits.None,
            states: BlobStates.None,
            prefix: "foto_",
            cancellationToken: ct))
        {
            ct.ThrowIfCancellationRequested();

            var modified = item.Properties.LastModified;
            if (modified is null)
                continue;

            if (latest is null || modified.Value > latest.LastModified)
            {
                latest = new BlobPhotoInfo(item.Name, modified.Value);
            }
        }

        return latest;
    }
}
