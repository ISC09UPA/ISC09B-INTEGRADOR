using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Servicios;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Lo que se sabe de un vehículo que llegó a la pluma, venga de donde venga.</summary>
/// <param name="Placa">Texto leído o confirmado; null si no fue legible.</param>
/// <param name="Confianza">0 a 1, lo que regresó el OCR (1 si la confirmó el administrador).</param>
/// <param name="FotoBlob">Nombre de la foto en Blob Storage.</param>
/// <param name="Origen">Maqueta (también la simulación) o Escáner.</param>
public sealed record PasoPluma(
    string? Placa,
    double Confianza,
    TipoVehiculo Tipo,
    string FotoBlob,
    OrigenAcceso Origen);

/// <summary>
/// Lógica principal de entrada y salida (CU-17). La usan la maqueta, el escáner y la simulación,
/// así las reglas de <see cref="ReglasAcceso"/> se aplican en un solo lugar.
/// </summary>
public interface IProcesadorPasoPluma
{
    /// <summary>
    /// Decide con <see cref="ReglasAcceso.Decidir"/> y guarda todo junto: el acceso,
    /// las alertas (entrada negada, placa no legible) y avisa en tiempo real.
    /// No manda nada a la maqueta: eso lo hace quien lo llama.
    /// </summary>
    Task<ResultadoPasoDto> ProcesarAsync(PasoPluma paso);

    /// <summary>La misma decisión que <see cref="ProcesarAsync"/>, pero sin guardar nada (vista previa del escáner).</summary>
    Task<DecisionPaso> PrevisualizarAsync(string? placa);
}
