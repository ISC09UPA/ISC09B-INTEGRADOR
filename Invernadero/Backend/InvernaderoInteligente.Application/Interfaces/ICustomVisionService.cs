public interface ICustomVisionClient
{
    Task<IReadOnlyList<PredictionDto>> ClassifyAsync(Stream image, CancellationToken ct = default);
}