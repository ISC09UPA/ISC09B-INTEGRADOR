using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Tests;

public class ServiciosTests
{
    private static VisitaDispositivoDto Visita(string eventId, int? mascotaId, string clase = "gato", DateTimeOffset? inicio = null)
    {
        var unix = (inicio ?? DateTimeOffset.UtcNow.AddHours(-1)).ToUnixTimeSeconds();
        return new VisitaDispositivoDto(Escenario.Feeder, eventId, mascotaId, clase, 0.93, unix, unix + 300, 0, 30, 5);
    }

    private static GuardarMascotaRequest Gato(string? rfid) => new(
        "Luna", Especie.Gato, 3.5, 24, NivelActividad.Moderado, true, 2, rfid);

    [Fact]
    public async Task Reenviar_un_lote_no_duplica_visitas()
    {
        using var e = new Escenario();
        var gato = e.AgregarMascota(Especie.Gato);
        var servicio = e.Dispositivo();

        await servicio.RegistrarVisitasAsync(e.Gateway.Id, [Visita("boot1-1", gato.Id)]);
        var segundo = await servicio.RegistrarVisitasAsync(e.Gateway.Id, [Visita("boot1-1", gato.Id)]);

        Assert.Equal(new LoteResponse(0, 1, 0), segundo);
        Assert.Equal(1, await e.Db.Visitas.CountAsync());
    }

    [Fact]
    public async Task Un_registro_invalido_no_bloquea_el_lote()
    {
        using var e = new Escenario();
        var gato = e.AgregarMascota(Especie.Gato);

        var resultado = await e.Dispositivo().RegistrarVisitasAsync(e.Gateway.Id,
            [Visita("boot1-1", gato.Id), Visita("boot1-2", gato.Id, clase: "conejo")]);

        Assert.Equal(new LoteResponse(1, 0, 1), resultado);
    }

    [Fact]
    public async Task El_evento_indica_la_tolva_afectada()
    {
        using var e = new Escenario();
        var ahora = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        await e.Dispositivo().RegistrarEventosAsync(e.Gateway.Id,
            [new EventoDispositivoDto(Escenario.Feeder, "boot1-3", "HOPPER_LOW", ahora, null, Hopper: 2)]);

        var alerta = await e.Db.Alertas.SingleAsync();
        Assert.Equal(TipoAlerta.TolvaBaja, alerta.Tipo);
        Assert.Contains("del gato", alerta.Mensaje);
    }

    [Fact]
    public async Task Al_reconectar_no_alerta_hasta_recibir_la_cola()
    {
        using var e = new Escenario();
        var gato = e.AgregarMascota(Especie.Gato);
        e.Gateway.AlertaSinConexionEnviada = true;
        e.Gateway.SinConexionDesde = DateTimeOffset.UtcNow.AddHours(-20);
        await e.Db.SaveChangesAsync();
        var dispositivo = e.Dispositivo();
        var monitoreo = e.Monitoreo();

        // Volvió internet, pero las visitas de las últimas 20 h aún vienen en camino
        await dispositivo.HeartbeatAsync(e.Gateway.Id, new HeartbeatRequest(
            DateTimeOffset.UtcNow.AddHours(-20).ToUnixTimeSeconds(), []));
        await monitoreo.DetectarAnomaliasAsync();
        Assert.Empty(await e.Db.Alertas.ToListAsync());

        await dispositivo.RegistrarVisitasAsync(e.Gateway.Id, [Visita("boot1-1", gato.Id)]);
        await dispositivo.TerminarSincronizacionAsync(e.Gateway.Id);
        await monitoreo.DetectarAnomaliasAsync();

        var alerta = await e.Db.Alertas.SingleAsync();
        Assert.Equal(TipoAlerta.ConexionRestablecida, alerta.Tipo);
        Assert.Contains("1 visita", alerta.Mensaje);
    }

    [Fact]
    public async Task Alerta_si_de_verdad_no_ha_comido()
    {
        using var e = new Escenario();
        e.AgregarMascota(Especie.Gato);

        await e.Monitoreo().DetectarAnomaliasAsync();

        Assert.Equal(TipoAlerta.NoHaComido, (await e.Db.Alertas.SingleAsync()).Tipo);
    }

    [Fact]
    public async Task Dos_gatos_necesitan_etiqueta_rfid()
    {
        using var e = new Escenario();
        e.AgregarMascota(Especie.Gato);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => e.Mascotas().CrearAsync(e.Alimentador.Id, Gato(rfid: null)));
    }

    [Fact]
    public async Task Dar_de_baja_conserva_las_visitas_y_libera_el_rfid()
    {
        using var e = new Escenario();
        var gato = e.AgregarMascota(Especie.Gato, rfid: "0A1B2C3D4E");
        await e.Dispositivo().RegistrarVisitasAsync(e.Gateway.Id, [Visita("boot1-1", gato.Id)]);

        await e.Mascotas().EliminarAsync(gato.Id);
        var nueva = await e.Mascotas().CrearAsync(e.Alimentador.Id, Gato("0A1B2C3D4E"));

        Assert.Equal(gato.Id, (await e.Db.Visitas.SingleAsync()).MascotaId);
        Assert.Equal(Domain.Entities.Mascota.TolvaGato, nueva.Tolva);
    }

    [Fact]
    public async Task Un_comando_entregado_sin_respuesta_termina_como_fallido()
    {
        using var e = new Escenario();
        var comando = new Domain.Entities.Comando
        {
            AlimentadorId = e.Alimentador.Id,
            Tipo = TipoComando.Dispensar,
            Estado = EstadoComando.Entregado,
            EntregadoEn = DateTimeOffset.UtcNow.AddMinutes(-3)
        };
        e.Db.Comandos.Add(comando);
        await e.Db.SaveChangesAsync();

        await e.Monitoreo().RevisarComandosAsync();

        Assert.Equal(EstadoComando.Fallido, comando.Estado);
    }
}
