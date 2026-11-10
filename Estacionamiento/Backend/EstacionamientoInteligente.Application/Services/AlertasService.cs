using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Domain.Servicios;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>Alertas del administrador (CU-24, CU-25 y CU-26).</summary>
public class AlertasService(
    IAlertaDao alertas,
    IAccesoDao accesos,
    IUnidadDeTrabajo unidadDeTrabajo,
    IAlmacenFotos fotos,
    INotificadorTiempoReal notificador,
    TimeProvider reloj) : IAlertasService
{
    public async Task<IReadOnlyList<AlertaDto>> ListarAsync(bool soloPendientes)
    {
        var lista = await alertas.ListarAsync(soloPendientes);
        return lista.Select(ADto).ToList();
    }

    public async Task AtenderAsync(Guid id, Guid administradorId)
    {
        var alerta = await alertas.ObtenerPorIdAsync(id)
            ?? throw new ExcepcionNoEncontrado("No existe esa alerta.");

        if (alerta.Atendida)
            throw new ExcepcionConflicto("La alerta ya fue atendida.");

        alerta.Atender(administradorId, reloj.GetUtcNow().UtcDateTime);
        await unidadDeTrabajo.GuardarCambiosAsync();
    }

    public async Task RevisarAutosSinCajonAsync()
    {
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var nuevas = new List<Alerta>();

        foreach (var acceso in await accesos.ObtenerEnTransitoAsync())
        {
            if (!ReglasAcceso.RequiereAlertaSinCajon(acceso, ahora))
                continue;

            // Solo una alerta pendiente por vehículo, aunque esto se revise cada minuto.
            if (await alertas.ExistePendienteAsync(TipoAlerta.CajonSinSalida, acceso.VehiculoId))
                continue;

            var tiempo = ahora - acceso.SinCajonDesde!.Value;
            var alerta = Alerta.CajonSinSalida(acceso.VehiculoId, acceso.Vehiculo.Placa?.Valor, tiempo, ahora);
            alertas.Agregar(alerta);
            nuevas.Add(alerta);
        }

        if (nuevas.Count == 0)
            return;

        await unidadDeTrabajo.GuardarCambiosAsync();

        // Se avisa después de guardar, para no anunciar algo que no quedó en la base.
        foreach (var alerta in nuevas)
            await notificador.AlertaCreadaAsync(ADto(alerta));
    }

    private AlertaDto ADto(Alerta a) =>
        new(
            a.Id,
            a.Tipo,
            a.Mensaje,
            a.Placa,
            a.Foto is null ? null : fotos.ObtenerUrl(a.Foto),
            a.VehiculoId,
            a.Fecha,
            a.Atendida);
}
