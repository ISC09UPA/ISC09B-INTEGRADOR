using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces.Externos;

/// <summary>Mensajes del backend a la Raspberry Pi. Lo implementa Infrastructure con Azure Service Bus.</summary>
public interface IComandosMaqueta
{
    /// <summary>Mensaje <c>pluma.respuesta</c>: abrir o negar el paso de la foto <paramref name="solicitudId"/>.</summary>
    Task ResponderPasoAsync(Guid solicitudId, ResultadoPasoDto resultado);

    /// <summary>Mensaje <c>pluma.abrir</c>: abrir sin validar (apertura manual o escáner).</summary>
    Task AbrirPlumaAsync(string? motivo);
}
