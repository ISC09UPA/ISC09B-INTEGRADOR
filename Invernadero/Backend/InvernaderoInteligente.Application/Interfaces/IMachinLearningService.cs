public interface IMachinLearningService
{
    bool IsConfigured { get; }

    Task<IReadOnlyList<PrediccionRiego>> PredecirRiegoAsync(
        LoteLecturas lote,
        CancellationToken cancellationToken);
}
