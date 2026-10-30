using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Application.Interfaces.Externos;

/// <summary>Lo que se pudo leer de una foto.</summary>
/// <param name="Placa">Null si no se encontró una placa.</param>
/// <param name="Confianza">0 a 1.</param>
/// <param name="Tipo"><see cref="TipoVehiculo.Desconocido"/> si no se pudo clasificar.</param>
public sealed record LecturaFoto(string? Placa, double Confianza, TipoVehiculo Tipo);

/// <summary>
/// Lee la placa (Computer Vision) y el tipo de vehículo (Custom Vision) de una foto.
/// Si Azure no está configurado, regresa placa null y tipo Desconocido en lugar de fallar.
/// </summary>
public interface ILectorPlacas
{
    /// <param name="fotoUrl">URL de la foto, la que da <see cref="IAlmacenFotos.ObtenerUrl"/>.</param>
    Task<LecturaFoto> LeerAsync(string fotoUrl);
}
