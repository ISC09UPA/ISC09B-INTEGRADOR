using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>
/// Pruebas sin hardware (CU-23). Pasa por los mismos services que los eventos reales,
/// solo que sin cámara, Raspberry ni Service Bus. El controller solo lo expone en Development.
/// </summary>
public class SimulacionService(
    IProcesadorPasoPluma procesador,
    ICajonesService cajones,
    TimeProvider reloj) : ISimulacionService
{
    /// <summary>Un acceso siempre necesita foto; en la simulación no hay cámara.</summary>
    public const string FotoSimulada = "simulacion/sin-foto.jpg";

    public Task<ResultadoPasoDto> VehiculoEnPlumaAsync(SimularVehiculoRequest request) =>
        procesador.ProcesarAsync(new PasoPluma(
            request.Placa,
            // Como si el OCR la hubiera leído perfecto; null simula placa no legible.
            Confianza: request.Placa is null ? 0 : 1,
            request.Tipo,
            FotoSimulada,
            OrigenAcceso.Maqueta));

    public Task CambiarCajonAsync(SimularCajonRequest request) =>
        cajones.RegistrarCambioSensorAsync(request.Numero, request.Ocupado, reloj.GetUtcNow().UtcDateTime);
}
