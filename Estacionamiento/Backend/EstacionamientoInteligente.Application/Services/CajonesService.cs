using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Domain.Servicios;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>Mapa, detalle de cajón y lecturas de los sensores IR (CU-04, CU-05 y CU-21).</summary>
public class CajonesService(
    ICajonDao cajones,
    IAccesoDao accesos,
    IEventoSensorDao eventos,
    IUnidadDeTrabajo unidadDeTrabajo,
    IAlmacenFotos fotos,
    INotificadorTiempoReal notificador,
    TimeProvider reloj) : ICajonesService
{
    public async Task<MapaCajonesDto> ObtenerMapaAsync(Guid usuarioId)
    {
        var lista = await cajones.ObtenerTodosAsync();
        var ultimoPluma = await eventos.ObtenerUltimoDePlumaAsync();

        // Cajón donde está estacionado el auto del usuario (si está dentro).
        var miAcceso = await accesos.ObtenerAbiertoDeUsuarioAsync(usuarioId);
        var miCajonId = miAcceso is { Estacionado: true } ? miAcceso.CajonId : null;

        return new MapaCajonesDto(
            Libres: lista.Count(c => c.EstaLibre),
            Total: lista.Count,
            PlumaAbierta: ultimoPluma?.PlumaAbierta ?? false,
            Cajones: lista
                .Select(c => new CajonDto(c.Numero, c.Estado, c.Id == miCajonId))
                .ToList());
    }

    public async Task<DetalleCajonDto> ObtenerDetalleAsync(int numero, Guid usuarioId, bool esAdministrador)
    {
        var cajon = await cajones.ObtenerPorNumeroAsync(numero)
            ?? throw new ExcepcionNoEncontrado($"No existe el cajón {numero}.");

        if (cajon.EstaLibre)
            return new DetalleCajonDto(cajon.Numero, cajon.Estado, EsMio: false, Vehiculo: null);

        // Ocupado: puede no haber acceso si el sensor detectó algo que no pasó por la pluma.
        var acceso = await accesos.ObtenerAbiertoEnCajonAsync(cajon.Id);
        var esMio = acceso?.Vehiculo.UsuarioId == usuarioId;

        // Un usuario solo ve los datos del auto si es suyo; el administrador ve todos.
        var vehiculo = acceso is not null && (esMio || esAdministrador)
            ? AVehiculoEnCajon(acceso)
            : null;

        return new DetalleCajonDto(cajon.Numero, cajon.Estado, esMio, vehiculo);
    }

    public async Task RegistrarCambioSensorAsync(int numero, bool ocupado, DateTime fecha)
    {
        var cajon = await cajones.ObtenerPorNumeroAsync(numero)
            ?? throw new ExcepcionNoEncontrado($"No existe el cajón {numero}.");

        // Lectura repetida del sensor: no se guarda ni se notifica.
        if (!cajon.ActualizarEstado(ocupado, fecha))
            return;

        eventos.Agregar(EventoSensor.CambioCajon(numero, ocupado, fecha));

        if (ocupado)
        {
            // Se asigna al auto que entró más recientemente y aún no tiene cajón.
            var enTransito = await accesos.ObtenerEnTransitoAsync();
            ReglasAcceso.ElegirAccesoParaCajon(enTransito)?.EstacionarEn(cajon.Id);
        }
        else
        {
            // El auto dejó el cajón; no es una salida (eso solo lo registra la pluma).
            var acceso = await accesos.ObtenerAbiertoEnCajonAsync(cajon.Id);
            acceso?.DejarCajon(fecha);
        }

        await unidadDeTrabajo.GuardarCambiosAsync();

        var libres = await cajones.ContarLibresAsync();
        await notificador.CajonActualizadoAsync(numero, cajon.Estado, libres, ReglasAcceso.TotalCajones);
    }

    private VehiculoEnCajonDto AVehiculoEnCajon(Acceso acceso) =>
        new(
            acceso.Vehiculo.Placa?.Valor,
            acceso.Vehiculo.Tipo,
            fotos.ObtenerUrl(acceso.FotoEntrada),
            acceso.HoraEntrada,
            acceso.HoraSalida,
            (int)acceso.Duracion(reloj.GetUtcNow().UtcDateTime).TotalMinutes);
}
