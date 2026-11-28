public sealed class LatestImageClassificationStore
{
    private readonly object _lock = new();
    private ImageClassificationResultDto? _latest;

    public ImageClassificationResultDto? Get()
    {
        lock (_lock)
            return _latest;
    }

    public void Set(ImageClassificationResultDto result)
    {
        lock (_lock)
            _latest = result;
    }
}