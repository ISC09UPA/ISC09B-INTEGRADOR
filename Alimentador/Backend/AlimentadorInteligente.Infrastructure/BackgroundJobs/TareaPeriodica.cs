using AlimentadorInteligente.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AlimentadorInteligente.Infrastructure.BackgroundJobs;

/// <summary>Ejecuta una tarea de IMonitoreoService cada cierto intervalo en su propio scope.</summary>
public abstract class TareaPeriodica(IServiceScopeFactory scopes, ILogger logger) : BackgroundService
{
    protected abstract TimeSpan Intervalo { get; }
    protected abstract Task EjecutarAsync(IMonitoreoService monitoreo, CancellationToken ct);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Intervalo);
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await EjecutarAsync(scope.ServiceProvider.GetRequiredService<IMonitoreoService>(), stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Falló la tarea {Tarea}", GetType().Name);
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

/// <summary>Alertas de ESP32 / Raspberry Pi sin conexión.</summary>
public class MonitorConexionJob(IServiceScopeFactory scopes, ILogger<MonitorConexionJob> logger) : TareaPeriodica(scopes, logger)
{
    protected override TimeSpan Intervalo => TimeSpan.FromMinutes(1);
    protected override Task EjecutarAsync(IMonitoreoService m, CancellationToken ct) => m.RevisarConexionesAsync(ct);
}

/// <summary>No ha comido, baja de apetito y palomas frecuentes.</summary>
public class DeteccionAnomaliasJob(IServiceScopeFactory scopes, ILogger<DeteccionAnomaliasJob> logger) : TareaPeriodica(scopes, logger)
{
    protected override TimeSpan Intervalo => TimeSpan.FromMinutes(15);
    protected override Task EjecutarAsync(IMonitoreoService m, CancellationToken ct) => m.DetectarAnomaliasAsync(ct);
}

/// <summary>
/// Ajuste nocturno de raciones. Corre cada hora y es idempotente por día, así que también
/// procesa los días que quedaron pendientes cuando la Pi estaba sin internet.
/// </summary>
public class AjusteNocturnoJob(IServiceScopeFactory scopes, ILogger<AjusteNocturnoJob> logger) : TareaPeriodica(scopes, logger)
{
    protected override TimeSpan Intervalo => TimeSpan.FromHours(1);
    protected override Task EjecutarAsync(IMonitoreoService m, CancellationToken ct) => m.AjustarRacionesAsync(ct);
}
