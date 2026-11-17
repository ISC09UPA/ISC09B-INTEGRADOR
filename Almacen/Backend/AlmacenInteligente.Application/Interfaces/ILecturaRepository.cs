using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface ILecturaRepository
{
    Task<bool> ExisteAsync(string lecturaId, CancellationToken ct = default);

    // Espacio con su producto y todos los espacios de ese producto (para la existencia total), con seguimiento de cambios.
    Task<Espacio?> ObtenerEspacioAsync(string espacioId, CancellationToken ct = default);

    Task<Alerta?> ObtenerAlertaActivaAsync(string productoId, CancellationToken ct = default);

    void Agregar(LecturaDispositivo lectura);
    void Agregar(LecturaPeso lectura);
    void Agregar(Movimiento movimiento);
    void Agregar(Alerta alerta);

    Task GuardarCambiosAsync(CancellationToken ct = default);
}
