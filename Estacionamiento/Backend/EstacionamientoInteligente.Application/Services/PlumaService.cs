using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>Pluma de la maqueta (CU-17 desde la maqueta, CU-19, CU-20 y CU-22).</summary>
public class PlumaService(
    IProcesadorPasoPluma procesador,
    ILectorPlacas lector,
    IAlmacenFotos fotos,
    IComandosMaqueta comandos,
    IEventoSensorDao eventos,
    IUnidadDeTrabajo unidadDeTrabajo,
    INotificadorTiempoReal notificador,
    TimeProvider reloj) : IPlumaService
{
    public async Task AbrirManualAsync(Guid administradorId, string? motivo)
    {
        // Primero la orden: si Service Bus falla, no queda registrada una apertura que no ocurrió.
        await comandos.AbrirPlumaAsync(motivo);

        var detalle = string.IsNullOrWhiteSpace(motivo)
            ? $"Apertura manual por el administrador {administradorId}"
            : $"Apertura manual por el administrador {administradorId}: {motivo.Trim()}";

        // Cuando la Pi confirme "abierta", RegistrarCambioEstadoAsync verá que ya estaba así y no lo repetirá.
        await GuardarCambioAsync(abierta: true, Ahora(), detalle);
    }

    public async Task<EstadoPlumaDto> ObtenerEstadoAsync()
    {
        var ultimo = await eventos.ObtenerUltimoDePlumaAsync();

        // Si la maqueta nunca ha reportado nada, se asume cerrada.
        return ultimo is null
            ? new EstadoPlumaDto(false, Ahora())
            : new EstadoPlumaDto(ultimo.PlumaAbierta, ultimo.Fecha);
    }

    public async Task ProcesarVehiculoDeMaquetaAsync(Guid solicitudId, string fotoBlob)
    {
        // Vision lee la placa y el tipo; si no está configurado regresa placa null (no legible).
        var lectura = await lector.LeerAsync(fotos.ObtenerUrl(fotoBlob));

        var resultado = await procesador.ProcesarAsync(new PasoPluma(
            lectura.Placa,
            lectura.Confianza,
            lectura.Tipo,
            fotoBlob,
            OrigenAcceso.Maqueta));

        // La Pi espera la respuesta con el mismo id para saber de qué foto es.
        await comandos.ResponderPasoAsync(solicitudId, resultado);
    }

    public async Task RegistrarCambioEstadoAsync(bool abierta, DateTime fecha)
    {
        var ultimo = await eventos.ObtenerUltimoDePlumaAsync();

        // Mismo estado que ya se tenía (por ejemplo, la confirmación de una apertura manual): se ignora.
        if (ultimo is not null && ultimo.PlumaAbierta == abierta)
            return;

        await GuardarCambioAsync(abierta, fecha, detalle: null);
    }

    private async Task GuardarCambioAsync(bool abierta, DateTime fecha, string? detalle)
    {
        eventos.Agregar(EventoSensor.CambioPluma(abierta, fecha, detalle));
        await unidadDeTrabajo.GuardarCambiosAsync();
        await notificador.PlumaActualizadaAsync(abierta, fecha);
    }

    private DateTime Ahora() => reloj.GetUtcNow().UtcDateTime;
}
