public class ImageClassificationService : IImageClassificationService
{
    private readonly IBlobStorageService _blobs;
    private readonly ICustomVisionClient _vision;

    public ImageClassificationService(IBlobStorageService blobs, ICustomVisionClient vision)
    {
        _blobs = blobs;
        _vision = vision;
    }

    public async Task<ImageClassificationResultDto> ClassifyBlobAsync(string blobName, CancellationToken ct = default)
    {
        if (!await _blobs.ExistsAsync(blobName, ct))
            throw new FileNotFoundException($"No existe el blob '{blobName}'.");

        await using var stream = await _blobs.OpenReadAsync(blobName, ct);
        var predictions = await _vision.ClassifyAsync(stream, ct);

        var top = predictions.OrderByDescending(p => p.Probability).FirstOrDefault();
        return new ImageClassificationResultDto(
            blobName, top?.Tag, top?.Probability ?? 0, predictions, DateTime.UtcNow);
    }
}