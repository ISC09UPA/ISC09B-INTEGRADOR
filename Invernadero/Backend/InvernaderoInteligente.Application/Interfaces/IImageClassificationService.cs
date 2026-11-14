public interface IImageClassificationService
{
    Task<ImageClassificationResultDto> ClassifyBlobAsync(string blobName, CancellationToken ct = default);
}