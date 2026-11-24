public interface IBlobStorageService
{
    Task<string> UploadPhotoAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);
    Task<bool> ExistsAsync(string blobName, CancellationToken ct = default);
    Task<Stream> OpenReadAsync(string blobName, CancellationToken ct = default);
}
