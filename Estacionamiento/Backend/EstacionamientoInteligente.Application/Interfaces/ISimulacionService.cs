using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Pruebas sin hardware, solo en Development (CU-23).</summary>
public interface ISimulacionService
{
    /// <summary>Como si la cámara hubiera leído esa placa; pasa por las mismas reglas que la maqueta.</summary>
    Task<ResultadoPasoDto> VehiculoEnPlumaAsync(SimularVehiculoRequest request);

    /// <summary>Como si un sensor IR hubiera cambiado.</summary>
    Task CambiarCajonAsync(SimularCajonRequest request);
}
