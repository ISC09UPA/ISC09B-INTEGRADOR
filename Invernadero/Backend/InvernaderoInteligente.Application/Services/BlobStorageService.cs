using Azure.Storage.Blobs;
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

    public async Task<bool> ExistsAsync(string blobName, CancellationToken ct = default) =>
        (await _container.GetBlobClient(blobName).ExistsAsync(ct)).Value;

    public async Task<Stream> OpenReadAsync(string blobName, CancellationToken ct = default) =>
        await _container.GetBlobClient(blobName).OpenReadAsync(cancellationToken: ct);
}
