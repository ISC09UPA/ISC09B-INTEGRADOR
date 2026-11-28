using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public sealed class LatestImageClassificationWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan QuietPeriod = TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly LatestImageClassificationStore _store;
    private readonly ILogger<LatestImageClassificationWorker> _logger;

    private string? _lastProcessedBlob;

    public LatestImageClassificationWorker(
        IServiceScopeFactory scopeFactory,
        LatestImageClassificationStore store,
        ILogger<LatestImageClassificationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _store = store;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Worker de clasificación de imágenes iniciado.");

        using var timer = new PeriodicTimer(PollInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckLatestPhotoAsync(stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al buscar o clasificar la última foto.");
            }

            try
            {
                if (!await timer.WaitForNextTickAsync(stoppingToken))
                    break;
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task CheckLatestPhotoAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();

        var blobs = scope.ServiceProvider
            .GetRequiredService<IBlobStorageService>();

        var classifier = scope.ServiceProvider
            .GetRequiredService<IImageClassificationService>();

        var photo = await blobs.GetLatestPhotoAsync(ct);

        if (photo is null)
        {
            _logger.LogInformation("Aún no hay fotos con prefijo foto_ en Blob.");
            return;
        }

        if (photo.Name == _lastProcessedBlob)
            return;

        var age = DateTimeOffset.UtcNow - photo.LastModified;

        // La Raspberry sigue subiendo imágenes. Espera a que el lote se calme.
        if (age < QuietPeriod)
            return;

        var result = await classifier.ClassifyBlobAsync(photo.Name, ct);

        _store.Set(result);
        _lastProcessedBlob = photo.Name;

        _logger.LogInformation(
            "Clasificación terminada. Blob: {BlobName}; clase: {Tag}; confianza: {Probability}",
            result.BlobName,
            result.TopTag,
            result.TopProbability);
    }
}
