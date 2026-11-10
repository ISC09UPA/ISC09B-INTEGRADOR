using System.Security.Cryptography;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Tests;

public class OtaYGatewaysTests
{
    private const string Admin = "diego@example.com";

    private static MemoryStream Archivo(params byte[] bytes) => new(bytes);

    private static async Task<ArtefactoOta> AgregarArtefactoAsync(Escenario e, TipoArtefactoOta tipo = TipoArtefactoOta.Firmware, string version = "1.2.0")
    {
        var artefacto = new ArtefactoOta { Tipo = tipo, Version = version, BlobNombre = $"firmware/{version}/fw.bin", Sha256 = "abc", TamanoBytes = 3 };
        e.Db.ArtefactosOta.Add(artefacto);
        await e.Db.SaveChangesAsync();
        return artefacto;
    }

    private static async Task<Comando> AgregarOtaAsync(Escenario e, ArtefactoOta artefacto, EstadoComando estado, DateTimeOffset? entregadoEn = null)
    {
        var comando = new Comando
        {
            AlimentadorId = e.Alimentador.Id,
            Tipo = TipoComando.Ota,
            ArtefactoOtaId = artefacto.Id,
            Estado = estado,
            EntregadoEn = entregadoEn
        };
        e.Db.Comandos.Add(comando);
        await e.Db.SaveChangesAsync();
        return comando;
    }

    // --- Publicación de artefactos ---

    [Fact]
    public async Task Publicar_un_artefacto_calcula_hash_y_tamano_y_lo_sube()
    {
        using var e = new Escenario();
        byte[] bytes = [1, 2, 3, 4, 5];

        var creado = await e.Ota(Admin).PublicarAsync(
            new PublicarArtefactoRequest("firmware", "1.3.0", "alimentador.bin"), Archivo(bytes));

        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(bytes)), creado.Sha256);
        Assert.Equal(5, creado.TamanoBytes);
        Assert.Equal(TipoArtefactoOta.Firmware, creado.Tipo);
        Assert.Equal(bytes, e.Archivos.Blobs["ota/firmware/1.3.0/alimentador.bin"]);
        Assert.Equal("firmware/1.3.0/alimentador.bin", (await e.Db.ArtefactosOta.SingleAsync()).BlobNombre);
    }

    [Fact]
    public async Task La_version_es_unica_por_tipo()
    {
        using var e = new Escenario();
        var ota = e.Ota(Admin);
        await ota.PublicarAsync(new PublicarArtefactoRequest("firmware", "1.0.0", "fw.bin"), Archivo(1));

        await Assert.ThrowsAsync<ConflictoException>(
            () => ota.PublicarAsync(new PublicarArtefactoRequest("firmware", "1.0.0", "fw.bin"), Archivo(2)));
        await ota.PublicarAsync(new PublicarArtefactoRequest("modelo", "1.0.0", "modelo.tflite"), Archivo(3));

        Assert.Equal(2, await e.Db.ArtefactosOta.CountAsync());
    }

    [Fact]
    public async Task Solo_los_administradores_publican()
    {
        using var e = new Escenario();

        await Assert.ThrowsAsync<ProhibidoException>(() => e.Ota("otro@example.com")
            .PublicarAsync(new PublicarArtefactoRequest("firmware", "1.0.0", "fw.bin"), Archivo(1)));

        Assert.Empty(e.Archivos.Blobs);
        Assert.False(await e.Db.ArtefactosOta.AnyAsync());
    }

    [Theory]
    [InlineData("bootloader", "1.0.0", new byte[] { 1 })]
    [InlineData("firmware", "../1.0", new byte[] { 1 })]
    [InlineData("firmware", "1.0.0", new byte[] { })]
    public async Task Rechaza_tipo_version_o_archivo_invalidos(string tipo, string version, byte[] bytes)
    {
        using var e = new Escenario();

        await Assert.ThrowsAsync<ReglaNegocioException>(() => e.Ota(Admin)
            .PublicarAsync(new PublicarArtefactoRequest(tipo, version, "fw.bin"), Archivo(bytes)));
    }

    [Fact]
    public async Task No_se_borra_un_artefacto_que_ya_se_uso()
    {
        using var e = new Escenario();
        var usado = await AgregarArtefactoAsync(e, version: "1.0.0");
        await AgregarOtaAsync(e, usado, EstadoComando.Completado);
        var libre = await AgregarArtefactoAsync(e, version: "1.1.0");
        e.Archivos.Blobs[$"ota/{libre.BlobNombre}"] = [1];

        await Assert.ThrowsAsync<ConflictoException>(() => e.Ota(Admin).EliminarAsync(usado.Id));
        await e.Ota(Admin).EliminarAsync(libre.Id);

        Assert.Equal(usado.Id, (await e.Db.ArtefactosOta.SingleAsync()).Id);
        Assert.Empty(e.Archivos.Blobs);
    }

    // --- Entrega y resultado ---

    [Fact]
    public async Task La_pi_recibe_target_version_y_hash_del_artefacto()
    {
        using var e = new Escenario();
        var artefacto = await AgregarArtefactoAsync(e, TipoArtefactoOta.Modelo, "7");
        await AgregarOtaAsync(e, artefacto, EstadoComando.Pendiente);

        var comando = Assert.Single(await e.Dispositivo().ObtenerComandosAsync(e.Gateway.Id));

        Assert.Equal("ota", comando.Type);
        Assert.Equal("model", comando.Target);
        Assert.Equal("7", comando.Version);
        Assert.Equal("abc", comando.Sha256);
        Assert.NotNull(comando.Url);
    }

    [Fact]
    public async Task Una_ota_exitosa_actualiza_la_version_del_alimentador()
    {
        using var e = new Escenario();
        var artefacto = await AgregarArtefactoAsync(e, version: "1.2.0");
        var comando = await AgregarOtaAsync(e, artefacto, EstadoComando.Entregado, DateTimeOffset.UtcNow);

        await e.Dispositivo().ReportarResultadoAsync(e.Gateway.Id, comando.Id, new ResultadoComandoRequest(true, null, null));

        Assert.Equal(EstadoComando.Completado, comando.Estado);
        Assert.Equal("1.2.0", e.Alimentador.VersionFirmware);
    }

    [Fact]
    public async Task Una_ota_fallida_no_cambia_la_version()
    {
        using var e = new Escenario();
        e.Alimentador.VersionFirmware = "1.1.0";
        var artefacto = await AgregarArtefactoAsync(e, version: "1.2.0");
        var comando = await AgregarOtaAsync(e, artefacto, EstadoComando.Entregado, DateTimeOffset.UtcNow);

        await e.Dispositivo().ReportarResultadoAsync(e.Gateway.Id, comando.Id, new ResultadoComandoRequest(false, null, "sha256 mismatch"));

        Assert.Equal(EstadoComando.Fallido, comando.Estado);
        Assert.Equal("sha256 mismatch", comando.Error);
        Assert.Equal("1.1.0", e.Alimentador.VersionFirmware);
    }

    [Fact]
    public async Task La_ota_espera_su_resultado_mas_que_un_dispensado()
    {
        using var e = new Escenario();
        var artefacto = await AgregarArtefactoAsync(e);
        var comando = await AgregarOtaAsync(e, artefacto, EstadoComando.Entregado, DateTimeOffset.UtcNow.AddMinutes(-10));

        await e.Monitoreo().RevisarComandosAsync();

        Assert.Equal(EstadoComando.Entregado, comando.Estado);
    }

    [Fact]
    public async Task El_resultado_que_llega_tras_el_timeout_reemplaza_al_fallo()
    {
        using var e = new Escenario();
        var artefacto = await AgregarArtefactoAsync(e, version: "1.2.0");
        var comando = await AgregarOtaAsync(e, artefacto, EstadoComando.Entregado,
            DateTimeOffset.UtcNow - Comando.EsperaResultadoOta - TimeSpan.FromMinutes(1));

        await e.Monitoreo().RevisarComandosAsync();
        Assert.Equal(EstadoComando.Fallido, comando.Estado);

        // La Pi estuvo sin internet y manda el resultado desde su cola
        await e.Dispositivo().ReportarResultadoAsync(e.Gateway.Id, comando.Id, new ResultadoComandoRequest(true, null, null));

        Assert.Equal(EstadoComando.Completado, comando.Estado);
        Assert.Null(comando.Error);
        Assert.Equal("1.2.0", e.Alimentador.VersionFirmware);
    }

    [Fact]
    public async Task Un_resultado_repetido_no_cambia_el_estado()
    {
        using var e = new Escenario();
        var artefacto = await AgregarArtefactoAsync(e);
        var comando = await AgregarOtaAsync(e, artefacto, EstadoComando.Entregado, DateTimeOffset.UtcNow);
        var dispositivo = e.Dispositivo();

        await dispositivo.ReportarResultadoAsync(e.Gateway.Id, comando.Id, new ResultadoComandoRequest(false, null, "flash error"));
        await dispositivo.ReportarResultadoAsync(e.Gateway.Id, comando.Id, new ResultadoComandoRequest(true, null, null));

        Assert.Equal(EstadoComando.Fallido, comando.Estado);
    }

    // --- Ligar alimentadores a gateways ---

    [Fact]
    public async Task El_dueno_liga_el_alimentador_a_su_propia_pi()
    {
        using var e = new Escenario();
        var nueva = new Gateway { DeviceId = "pi-sala", DeviceKeyHash = "x", PropietarioId = Escenario.DuenoId };
        e.Db.Gateways.Add(nueva);
        await e.Db.SaveChangesAsync();
        int versionAntes = e.Alimentador.VersionConfiguracion;

        var dto = await e.Alimentadores().LigarGatewayAsync(e.Alimentador.Id, new LigarGatewayRequest(nueva.Id));

        Assert.Equal(nueva.Id, dto.GatewayId);
        Assert.Equal("pi-sala", dto.GatewayDeviceId);
        Assert.Equal(nueva.Id, e.Alimentador.GatewayId);
        Assert.True(e.Alimentador.VersionConfiguracion > versionAntes);
    }

    [Fact]
    public async Task No_se_liga_a_la_pi_de_otro_usuario()
    {
        using var e = new Escenario();
        e.AgregarUsuario(2);
        var ajena = new Gateway { DeviceId = "pi-vecino", DeviceKeyHash = "x", PropietarioId = 2 };
        e.Db.Gateways.Add(ajena);
        await e.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<ProhibidoException>(
            () => e.Alimentadores().LigarGatewayAsync(e.Alimentador.Id, new LigarGatewayRequest(ajena.Id)));
        Assert.Equal(e.Gateway.Id, e.Alimentador.GatewayId);
    }

    [Fact]
    public async Task Un_cuidador_no_cambia_la_pi_aunque_sea_suya()
    {
        using var e = new Escenario();
        e.AgregarUsuario(2, RolAlimentador.Cuidador);
        var suya = new Gateway { DeviceId = "pi-cuidador", DeviceKeyHash = "x", PropietarioId = 2 };
        e.Db.Gateways.Add(suya);
        await e.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<ProhibidoException>(
            () => e.Alimentadores(2).LigarGatewayAsync(e.Alimentador.Id, new LigarGatewayRequest(suya.Id)));
    }

    [Fact]
    public async Task Desligar_quita_la_pi_y_el_alimentador_deja_de_estar_en_linea()
    {
        using var e = new Escenario();
        e.Alimentador.EnLinea = true;
        await e.Db.SaveChangesAsync();

        var dto = await e.Alimentadores().DesligarGatewayAsync(e.Alimentador.Id);

        Assert.Null(dto.GatewayId);
        Assert.Null(e.Alimentador.GatewayId);
        Assert.False(dto.Estado.DispensadoRemotoDisponible);
        Assert.Null(await e.Dispositivo().ObtenerConfiguracionAsync(e.Gateway.Id, 0));
    }
}
