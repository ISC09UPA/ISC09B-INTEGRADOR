using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public sealed class LecturasWorker : BackgroundService
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusSettings _settings;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<LecturasWorker> _log;
    private ServiceBusProcessor? _processor;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public LecturasWorker([FromKeyedServices("lecturas")] ServiceBusClient client, IOptions<ServiceBusSettings> settings,
        IServiceScopeFactory scopes, ILogger<LecturasWorker> log)
    { _client = client; _settings = settings.Value; _scopes = scopes; _log = log; }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _processor = _client.CreateProcessor(_settings.ColaLecturas,
            new ServiceBusProcessorOptions { AutoCompleteMessages = false, MaxConcurrentCalls = 1 });
        _processor.ProcessMessageAsync += ProcesarAsync;
        _processor.ProcessErrorAsync += e =>
        { _log.LogError(e.Exception, "Error en Service Bus"); return Task.CompletedTask; };
        await _processor.StartProcessingAsync(ct);
        try { await Task.Delay(Timeout.Infinite, ct); } catch (OperationCanceledException) { }
    }

    private async Task ProcesarAsync(ProcessMessageEventArgs args)
    {
        LoteLecturas? lote;
        try { lote = JsonSerializer.Deserialize<LoteLecturas>(args.Message.Body.ToString(), JsonOptions); }
        catch (JsonException) { lote = null; }
        if (lote is null)
        {
            await args.DeadLetterMessageAsync(args.Message, "json_invalido", cancellationToken: args.CancellationToken);
            return;
        }
        using var scope = _scopes.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IProcesarLecturasService>();
        await service.ProcesarAsync(lote, args.CancellationToken);
        await args.CompleteMessageAsync(args.Message, args.CancellationToken);
    }

    public override async Task StopAsync(CancellationToken ct)
    {
        if (_processor is not null)
        {
            await _processor.StopProcessingAsync(ct);
            await _processor.DisposeAsync();
        }
        await base.StopAsync(ct);
    }
}


