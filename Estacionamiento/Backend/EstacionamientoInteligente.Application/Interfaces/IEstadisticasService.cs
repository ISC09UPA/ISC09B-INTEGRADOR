using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Panel del administrador (CU-09 a CU-11). Las fechas null significan "hoy".</summary>
public interface IEstadisticasService
{
    Task<PanelDto> ObtenerPanelAsync(DateOnly? fecha);

    /// <summary>Las 24 horas del día, de 0 a 23.</summary>
    Task<IReadOnlyList<OcupacionHoraDto>> ObtenerOcupacionPorHoraAsync(DateOnly? fecha);

    /// <summary>Los 4 cajones, incluidos los que no se usaron.</summary>
    Task<IReadOnlyList<UsoCajonDto>> ObtenerUsoPorCajonAsync(DateOnly? desde, DateOnly? hasta);
}
