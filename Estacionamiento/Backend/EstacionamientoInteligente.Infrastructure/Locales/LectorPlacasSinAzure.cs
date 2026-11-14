using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Infrastructure.Locales;

/// <summary>
/// Lector para cuando Azure Vision no está configurado: no lee nada.
/// El escáner muestra "placa no legible" y el administrador la escribe a mano.
/// </summary>
/// <remarks>Se reemplaza por Computer Vision + Custom Vision en la Fase 4.</remarks>
public class LectorPlacasSinAzure : ILectorPlacas
{
    public Task<LecturaFoto> LeerAsync(string fotoUrl) =>
        Task.FromResult(new LecturaFoto(null, 0, TipoVehiculo.Desconocido));
}
