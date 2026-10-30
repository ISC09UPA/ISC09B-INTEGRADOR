using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Pluma de la maqueta (CU-17 desde la maqueta, CU-19, CU-20 y CU-22).</summary>
public interface IPlumaService
{
    /// <summary>Apertura manual: abre sin validar reglas y deja registrado quién la abrió.</summary>
    Task AbrirManualAsync(Guid administradorId, string? motivo);

    Task<EstadoPlumaDto> ObtenerEstadoAsync();

    /// <summary>
    /// Mensaje <c>pluma.vehiculo</c> de la Raspberry: lee la placa de la foto, decide con
    /// <see cref="IProcesadorPasoPluma"/> y le responde a la Pi si abre o niega.
    /// </summary>
    /// <param name="solicitudId">Viaja de regreso en la respuesta para que la Pi sepa de qué foto es.</param>
    /// <param name="fotoBlob">Nombre de la foto que la Pi ya subió a Blob Storage.</param>
    Task ProcesarVehiculoDeMaquetaAsync(Guid solicitudId, string fotoBlob);

    /// <summary>Mensaje <c>pluma.estado</c>: la pluma se abrió o se cerró.</summary>
    Task RegistrarCambioEstadoAsync(bool abierta, DateTime fecha);
}
