public interface IBlobStorageService
{
    Task<bool> ExistsAsync(string blobName, CancellationToken ct = default);
    Task<Stream> OpenReadAsync(string blobName, CancellationToken ct = default);
}
