// DTOs/ImageClassificationDtos.cs
public record PredictionDto(string Tag, double Probability);

public record ImageClassificationResultDto(
    string BlobName,
    string? TopTag,
    double TopProbability,
    IReadOnlyList<PredictionDto> Predictions,
    DateTime ClassifiedAtUtc);

public record ClassifyRequestDto(string BlobName);