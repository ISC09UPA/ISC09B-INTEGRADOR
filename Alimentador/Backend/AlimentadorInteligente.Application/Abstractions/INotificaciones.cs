using AlimentadorInteligente.Application.DTOs;

namespace AlimentadorInteligente.Application.Abstractions;

/// <summary>Envío en tiempo real a la app (SignalR, RF-20).</summary>
public interface INotificadorTiempoReal
{
    Task VisitaRegistradaAsync(int alimentadorId, VisitaDto visita, CancellationToken ct = default);
    Task AlertaCreadaAsync(int alimentadorId, AlertaDto alerta, CancellationToken ct = default);
    Task ComandoActualizadoAsync(int alimentadorId, ComandoDto comando, CancellationToken ct = default);
    Task EstadoAlimentadorAsync(int alimentadorId, EstadoAlimentadorDto estado, CancellationToken ct = default);
}

/// <summary>Notificaciones push (Expo Notifications).</summary>
public interface IPushService
{
    Task EnviarAsync(IEnumerable<string> expoTokens, string titulo, string cuerpo, CancellationToken ct = default);
}

/// <summary>Azure Blob Storage: fotos dudosas, modelos y firmware.</summary>
public interface IAlmacenamientoArchivos
{
    Uri GenerarUrlSubida(string contenedor, string blobNombre, TimeSpan vigencia);
    Uri GenerarUrlDescarga(string contenedor, string blobNombre, TimeSpan vigencia);
}
