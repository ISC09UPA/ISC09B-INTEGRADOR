public sealed class MachineLearningSettings
{
    public string ScoringUri { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
}

public sealed record PrediccionRiego(string Maceta, string Regar);
