using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

public sealed class BusService : IBusServices, IAsyncDisposable
{
    private static readonly JsonSerializerOptions JsonOpts = new() { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
    private readonly ServiceBusSender _sender;

    public BusService([FromKeyedServices("comandos")] ServiceBusClient client, IOptions<ServiceBusSettings> options)
    {
        _sender = client.CreateSender(options.Value.ColaComandos);
    }

    public Task EnviarComandoAsync(ComandoDto comando, CancellationToken ct = default)
    {
        var msg = new ServiceBusMessage(JsonSerializer.Serialize(comando, JsonOpts))
        {
            ContentType = "application/json",
            TimeToLive = TimeSpan.FromMinutes(2)
        };
        return _sender.SendMessageAsync(msg, ct);
    }

    public ValueTask DisposeAsync() => _sender.DisposeAsync();
}
