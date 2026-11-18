using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;

namespace AlmacenInteligente.Application.Services;

// Consulta de alertas de reorden (pestaña Alertas de la app).
// Las alertas las crea y las atiende el backend con ReglaReorden; aquí solo se listan
// y el admin puede marcar una como atendida a mano.
public class AlertaService(IAlertaRepository alertas) : IAlertaService
{
    private const int LimitePorDefecto = 50;
    private const int LimiteMaximo = 200;

    public async Task<Resultado<List<AlertaDto>>> ListarAsync(string? estado, int? limite, CancellationToken ct = default)
    {
        var filtro = string.IsNullOrWhiteSpace(estado) ? null : estado.Trim().ToUpperInvariant();
        if (filtro is not (null or EstadosAlerta.Activa or EstadosAlerta.Atendida))
            return Resultado<List<AlertaDto>>.Falla(TipoError.Validacion, "El estado debe ser ACTIVA o ATENDIDA.");

        var tope = Math.Clamp(limite ?? LimitePorDefecto, 1, LimiteMaximo);
        var lista = await alertas.ListarAsync(filtro, tope, ct);
        return Resultado<List<AlertaDto>>.Exito(lista.Select(a => AlertaMapeo.Desde(a)).ToList());
    }

    public async Task<Resultado<AlertaDto>> AtenderAsync(long id, CancellationToken ct = default)
    {
        var alerta = await alertas.ObtenerPorIdAsync(id, ct);
        if (alerta is null)
            return Resultado<AlertaDto>.Falla(TipoError.NoEncontrado, $"No existe la alerta {id}.");
        if (alerta.Estado == EstadosAlerta.Atendida)
            return Resultado<AlertaDto>.Falla(TipoError.Conflicto, $"La alerta {id} ya estaba atendida.");

        // Si el producto sigue en su punto de reorden, el siguiente movimiento o lectura creará otra alerta.
        alerta.Estado = EstadosAlerta.Atendida;
        alerta.AtendidaEn = DateTime.UtcNow;
        await alertas.GuardarCambiosAsync(ct);

        return Resultado<AlertaDto>.Exito(AlertaMapeo.Desde(alerta));
    }
}
