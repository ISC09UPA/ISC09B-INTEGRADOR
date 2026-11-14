using EstacionamientoInteligente.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EstacionamientoInteligente.Infrastructure.Tareas;

/// <summary>
/// Proceso que corre en segundo plano mientras la API está prendida: cada minuto busca autos
/// que llevan demasiado tiempo dentro sin estacionarse y les crea su alerta (CU-26).
/// </summary>
public class RevisionAutosSinCajon(IServiceScopeFactory scopes, ILogger<RevisionAutosSinCajon> logger) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Intervalo);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                // Cada vuelta es como una petición: su propio scope con su DbContext.
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<IAlertasService>().RevisarAutosSinCajonAsync();
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Si la base falla una vez, se registra y se vuelve a intentar al siguiente minuto.
                logger.LogError(ex, "Falló la revisión de autos sin cajón.");
            }
        }
    }
}
