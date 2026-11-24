using Microsoft.Extensions.Logging;

public class ProcesarLecturasService : IProcesarLecturasService
{
    private readonly ILogger<ProcesarLecturasService> _log;
    private readonly IMachinLearningService _machinLearning;

    public ProcesarLecturasService(
        ILogger<ProcesarLecturasService> log,
        IMachinLearningService machinLearning)
    {
        _log = log;
        _machinLearning = machinLearning;
    }

    public async Task ProcesarAsync(LoteLecturas lote, CancellationToken ct)
    {
        _log.LogInformation("Lote recibido de {d}: {n} macetas, temperatura {t} °C, nivel del tanque {nivel}",
            lote.Dispositivo, lote.Macetas.Count, lote.TemperaturaC, lote.NivelTanque);

        if (!_machinLearning.IsConfigured)
        {
            _log.LogWarning("Azure ML no está configurado; se omite la predicción.");
            return;
        }

        var nivel = lote.NivelTanque.Trim().ToUpperInvariant();
        if (nivel is "VACIO" or "ERROR DE SENSOR")
        {
            foreach (var maceta in lote.Macetas)
                _log.LogInformation("Recomendación para {maceta}: NO REGAR (bloqueo por tanque {nivel}).", maceta.Maceta, nivel);
            return;
        }

        var predicciones = await _machinLearning.PredecirRiegoAsync(lote, ct);
        foreach (var prediccion in predicciones)
            _log.LogInformation("Azure ML recomienda para {maceta}: {regar} regar.", prediccion.Maceta, prediccion.Regar);
    }
}
