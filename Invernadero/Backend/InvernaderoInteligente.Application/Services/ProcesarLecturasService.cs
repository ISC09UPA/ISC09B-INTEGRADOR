using Microsoft.Extensions.Logging;

public class ProcesarLecturasService : IProcesarLecturasService
{
    private readonly ILogger<ProcesarLecturasService> _log;
    public ProcesarLecturasService(ILogger<ProcesarLecturasService> log) => _log = log;

    public Task ProcesarAsync(LoteLecturas lote, CancellationToken ct)
    {
        _log.LogInformation("Lote recibido de {d}: {n} macetas, temperatura {t} °C",
            lote.Dispositivo, lote.Macetas.Count, lote.TemperaturaC);
        return Task.CompletedTask;
    }
}