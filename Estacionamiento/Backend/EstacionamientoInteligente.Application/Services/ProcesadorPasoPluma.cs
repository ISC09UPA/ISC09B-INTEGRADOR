using EstacionamientoInteligente.Application.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Domain.Servicios;
using EstacionamientoInteligente.Domain.ValueObjects;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>
/// Lógica principal de entrada y salida (CU-17). La usan la maqueta, el escáner y la simulación.
/// Las reglas viven en <see cref="ReglasAcceso"/>; aquí se juntan los datos, se guarda y se avisa.
/// </summary>
public class ProcesadorPasoPluma(
    IVehiculoDao vehiculos,
    IAccesoDao accesos,
    ICajonDao cajones,
    IAlertaDao alertas,
    IUnidadDeTrabajo unidadDeTrabajo,
    IAlmacenFotos fotos,
    INotificadorTiempoReal notificador,
    TimeProvider reloj) : IProcesadorPasoPluma
{
    /// <summary>Lo que se consultó de la base para decidir.</summary>
    private sealed record Situacion(Placa? Placa, Vehiculo? Vehiculo, Acceso? Abierto, DecisionPaso Decision);

    public async Task<DecisionPaso> PrevisualizarAsync(string? placa) =>
        (await AnalizarAsync(placa, Ahora())).Decision;

    public async Task<ResultadoPasoDto> ProcesarAsync(PasoPluma paso)
    {
        var ahora = Ahora();
        var (placa, vehiculo, abierto, decision) = await AnalizarAsync(paso.Placa, ahora);

        var nuevasAlertas = new List<Alerta>();
        Acceso? acceso = null;
        int? minutos = null;

        switch (decision.Motivo)
        {
            case MotivoDecision.LecturaRepetida:
                // La misma placa otra vez en pocos segundos: no se guarda ni se avisa nada.
                return Resultado(decision, placa, abierto?.Id, null);

            case MotivoDecision.SalidaRegistrada:
                acceso = abierto!;
                acceso.RegistrarSalida(ahora, paso.FotoBlob);
                vehiculo!.ActualizarTipo(paso.Tipo);
                minutos = (int)acceso.Duracion(ahora).TotalMinutes;
                break;

            case MotivoDecision.EntradaPermitida:
                if (vehiculo is null)
                {
                    // Primera vez que pasa: se registra. Si no se leyó la placa, se avisa para corregirla.
                    vehiculo = placa is not null
                        ? Vehiculo.Registrar(placa, paso.Tipo, ahora)
                        : Vehiculo.RegistrarSinPlaca(paso.Tipo, ahora);
                    vehiculos.Agregar(vehiculo);

                    if (placa is null)
                        nuevasAlertas.Add(Alerta.PlacaNoLegible(vehiculo.Id, paso.FotoBlob, ahora));
                }
                else
                {
                    vehiculo.ActualizarTipo(paso.Tipo);
                }

                acceso = Acceso.RegistrarEntrada(vehiculo.Id, ahora, paso.FotoBlob, paso.Confianza, paso.Origen);
                accesos.Agregar(acceso);
                break;

            case MotivoDecision.EstacionamientoLleno:
                nuevasAlertas.Add(Alerta.EntradaNegada(placa?.Valor, paso.FotoBlob, ahora));
                break;
        }

        foreach (var alerta in nuevasAlertas)
            alertas.Agregar(alerta);

        // Acceso, vehículo y alertas se guardan juntos: o todo o nada.
        await unidadDeTrabajo.GuardarCambiosAsync();

        // Se avisa después de guardar, para no anunciar algo que no quedó en la base.
        if (acceso is not null)
        {
            await notificador.AccesoRegistradoAsync(
                decision.Tipo,
                placa?.Valor,
                decision.Tipo == TipoPaso.Salida ? acceso.Cajon?.Numero : null,
                ahora,
                vehiculo?.UsuarioId);
        }
        foreach (var alerta in nuevasAlertas)
            await notificador.AlertaCreadaAsync(Mapeos.AAlertaDto(alerta, fotos));

        return Resultado(decision, placa, acceso?.Id, minutos);
    }

    /// <summary>Consulta lo necesario y aplica <see cref="ReglasAcceso.Decidir"/>. No guarda nada.</summary>
    private async Task<Situacion> AnalizarAsync(string? textoPlaca, DateTime ahora)
    {
        Placa.TryCrear(textoPlaca, out var placa);

        var vehiculo = placa is null ? null : await vehiculos.ObtenerPorPlacaAsync(placa);

        Acceso? abierto = null;
        DateTime? ultimoPaso = null;
        if (vehiculo is not null)
        {
            abierto = await accesos.ObtenerAbiertoDeVehiculoAsync(vehiculo.Id);

            // El último paso es la salida si ya salió; si no, la entrada.
            var ultimo = await accesos.ObtenerUltimoDeVehiculoAsync(vehiculo.Id);
            ultimoPaso = ultimo?.HoraSalida ?? ultimo?.HoraEntrada;
        }

        var contexto = new ContextoPaso(
            PlacaLegible: placa is not null,
            TieneEntradaAbierta: abierto is not null,
            UltimoPasoMismaPlaca: ultimoPaso,
            CajonesLibres: await cajones.ContarLibresAsync(),
            AutosEnTransito: (await accesos.ObtenerEnTransitoAsync()).Count,
            Ahora: ahora);

        return new Situacion(placa, vehiculo, abierto, ReglasAcceso.Decidir(contexto));
    }

    private static ResultadoPasoDto Resultado(DecisionPaso d, Placa? placa, Guid? accesoId, int? minutos) =>
        new(d.Accion, d.Tipo, d.Motivo, placa?.Valor, accesoId, minutos);

    private DateTime Ahora() => reloj.GetUtcNow().UtcDateTime;
}
