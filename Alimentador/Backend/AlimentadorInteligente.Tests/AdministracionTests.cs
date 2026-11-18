using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Services;
using AlimentadorInteligente.Application.Validators;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Tests;

public class AdministracionTests
{
    private const string Password = "contrasena123";

    private static Alimentador AgregarAlimentador(
        Escenario e, string codigo, int duenoId, Gateway? gateway = null, bool enLinea = false, DateTimeOffset? creadoEn = null)
    {
        var alimentador = new Alimentador
        {
            Codigo = codigo,
            Nombre = $"Alimentador {codigo}",
            Gateway = gateway,
            EnLinea = enLinea,
            CreadoEn = creadoEn ?? DateTimeOffset.UtcNow
        };
        alimentador.Miembros.Add(new MiembroAlimentador { UsuarioId = duenoId, Rol = RolAlimentador.Dueno });
        e.Db.Alimentadores.Add(alimentador);
        e.Db.SaveChanges();
        return alimentador;
    }

    private static ArtefactoOta AgregarArtefacto(Escenario e, TipoArtefactoOta tipo = TipoArtefactoOta.Firmware, string version = "1.2.0")
    {
        var artefacto = new ArtefactoOta { Tipo = tipo, Version = version, BlobNombre = $"x/{version}/a.bin", Sha256 = "abc", TamanoBytes = 3 };
        e.Db.ArtefactosOta.Add(artefacto);
        e.Db.SaveChanges();
        return artefacto;
    }

    private static Comando AgregarComando(
        Escenario e, int alimentadorId, EstadoComando estado, TipoComando tipo = TipoComando.Ota, ArtefactoOta? artefacto = null)
    {
        var comando = new Comando
        {
            AlimentadorId = alimentadorId,
            Tipo = tipo,
            Estado = estado,
            ArtefactoOtaId = artefacto?.Id,
            Gramos = tipo == TipoComando.Dispensar ? 20 : (double?)null
        };
        e.Db.Comandos.Add(comando);
        e.Db.SaveChanges();
        return comando;
    }

    // --- Autenticación ---

    [Fact]
    public async Task El_correo_inicial_se_vuelve_administrador_al_registrarse()
    {
        using var e = new Escenario();

        var respuesta = await e.Auth(" Ana@Example.com ").RegistrarAsync(new RegistroRequest("Ana", "ana@example.com", Password));

        Assert.True(respuesta.EsAdministrador);
        var ana = await e.Db.Usuarios.SingleAsync(u => u.Id == respuesta.UsuarioId);
        Assert.True(ana.EsAdministrador);
        Assert.NotNull(ana.UltimoAcceso);
    }

    [Fact]
    public async Task El_correo_inicial_se_promueve_al_iniciar_sesion_y_salir_de_la_lista_no_quita_el_rol()
    {
        using var e = new Escenario();
        var registro = await e.Auth().RegistrarAsync(new RegistroRequest("Ana", "ana@example.com", Password));
        Assert.False(registro.EsAdministrador);

        var promovido = await e.Auth("ana@example.com").LoginAsync(new LoginRequest("ana@example.com", Password));
        var sinLista = await e.Auth().LoginAsync(new LoginRequest("ana@example.com", Password));

        Assert.True(promovido.EsAdministrador);
        Assert.True(sinLista.EsAdministrador);
    }

    [Fact]
    public async Task Yo_devuelve_el_usuario_de_la_sesion()
    {
        using var e = new Escenario();
        e.HacerAdministrador();

        var yo = await e.Auth().ObtenerYoAsync();

        Assert.Equal(new YoDto(Escenario.DuenoId, "Diego", "diego@example.com", true), yo);
    }

    [Fact]
    public async Task Login_con_cuenta_desactivada_es_prohibido()
    {
        using var e = new Escenario();
        var auth = e.Auth();
        var registro = await auth.RegistrarAsync(new RegistroRequest("Ana", "ana@example.com", Password));
        (await e.Db.Usuarios.SingleAsync(u => u.Id == registro.UsuarioId)).Activo = false;
        await e.Db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<ProhibidoException>(
            () => auth.LoginAsync(new LoginRequest("ana@example.com", Password)));

        Assert.Equal("Tu cuenta está desactivada. Contacta a un administrador.", error.Message);
        // Con una contraseña incorrecta no se revela que la cuenta existe y está desactivada
        await Assert.ThrowsAsync<NoAutorizadoException>(
            () => auth.LoginAsync(new LoginRequest("ana@example.com", "otra-contrasena")));
    }

    [Fact]
    public async Task Refresh_con_cuenta_desactivada_no_autoriza()
    {
        using var e = new Escenario();
        var auth = e.Auth();
        var registro = await auth.RegistrarAsync(new RegistroRequest("Ana", "ana@example.com", Password));
        (await e.Db.Usuarios.SingleAsync(u => u.Id == registro.UsuarioId)).Activo = false;
        await e.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<NoAutorizadoException>(() => auth.RefreshAsync(new RefreshRequest(registro.RefreshToken)));
    }

    [Fact]
    public async Task Refresh_actualiza_el_ultimo_acceso()
    {
        using var e = new Escenario();
        var auth = e.Auth();
        var registro = await auth.RegistrarAsync(new RegistroRequest("Ana", "ana@example.com", Password));
        var ana = await e.Db.Usuarios.SingleAsync(u => u.Id == registro.UsuarioId);
        ana.UltimoAcceso = DateTimeOffset.UtcNow.AddDays(-3);
        await e.Db.SaveChangesAsync();

        await auth.RefreshAsync(new RefreshRequest(registro.RefreshToken));

        Assert.True(ana.UltimoAcceso > DateTimeOffset.UtcNow.AddMinutes(-1));
    }

    // --- OTA: publicar exige el rol ---

    [Fact]
    public async Task Un_administrador_desactivado_no_publica_artefactos()
    {
        using var e = new Escenario();
        var ota = e.Ota();
        (await e.Db.Usuarios.SingleAsync(u => u.Id == Escenario.DuenoId)).Activo = false;
        await e.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<ProhibidoException>(() => ota.PublicarAsync(
            new PublicarArtefactoRequest("firmware", "1.0.0", "fw.bin"), new MemoryStream(new byte[] { 1, 2, 3 })));
    }

    // --- Usuarios: rol y activación ---

    [Fact]
    public async Task Un_administrador_no_puede_quitarse_su_rol_ni_desactivarse()
    {
        using var e = new Escenario();
        e.HacerAdministrador();
        e.AgregarUsuario(2);
        e.HacerAdministrador(2);
        var servicio = e.AdminUsuarios();

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => servicio.CambiarAdministradorAsync(Escenario.DuenoId, new CambiarAdministradorRequest(false)));
        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => servicio.CambiarActivoAsync(Escenario.DuenoId, new CambiarActivoRequest(false)));

        var diego = await e.Db.Usuarios.SingleAsync(u => u.Id == Escenario.DuenoId);
        Assert.True(diego.EsAdministrador);
        Assert.True(diego.Activo);
    }

    [Fact]
    public async Task No_se_quita_el_rol_ni_se_desactiva_al_ultimo_administrador_activo()
    {
        using var e = new Escenario();
        e.AgregarUsuario(2);
        e.HacerAdministrador(2);
        // Otro administrador, pero desactivado: no cuenta
        var inactivo = e.AgregarUsuario(3);
        inactivo.EsAdministrador = true;
        inactivo.Activo = false;
        await e.Db.SaveChangesAsync();
        // La política de la API es la que exige el rol; aquí se prueba solo la regla del servicio
        var servicio = e.AdminUsuarios(Escenario.DuenoId);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => servicio.CambiarAdministradorAsync(2, new CambiarAdministradorRequest(false)));
        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => servicio.CambiarActivoAsync(2, new CambiarActivoRequest(false)));

        // Al administrador desactivado sí se le puede quitar el rol
        var dto = await servicio.CambiarAdministradorAsync(3, new CambiarAdministradorRequest(false));
        Assert.False(dto.EsAdministrador);
    }

    [Fact]
    public async Task Se_da_y_se_quita_el_rol_si_queda_otro_administrador()
    {
        using var e = new Escenario();
        e.HacerAdministrador();
        e.AgregarUsuario(2);
        var servicio = e.AdminUsuarios();

        var dado = await servicio.CambiarAdministradorAsync(2, new CambiarAdministradorRequest(true));
        var quitado = await servicio.CambiarAdministradorAsync(2, new CambiarAdministradorRequest(false));

        Assert.True(dado.EsAdministrador);
        Assert.False(quitado.EsAdministrador);
        await Assert.ThrowsAsync<NoEncontradoException>(
            () => servicio.CambiarAdministradorAsync(99, new CambiarAdministradorRequest(true)));
    }

    [Fact]
    public async Task Desactivar_revoca_los_refresh_tokens_y_reactivar_no_los_devuelve()
    {
        using var e = new Escenario();
        e.HacerAdministrador();
        e.AgregarUsuario(2);
        var revocadoAntes = DateTimeOffset.UtcNow.AddDays(-5);
        e.Db.RefreshTokens.AddRange(
            new RefreshToken { UsuarioId = 2, TokenHash = "a", ExpiraEn = DateTimeOffset.UtcNow.AddDays(10) },
            new RefreshToken { UsuarioId = 2, TokenHash = "b", ExpiraEn = DateTimeOffset.UtcNow.AddDays(20) },
            new RefreshToken { UsuarioId = 2, TokenHash = "c", ExpiraEn = DateTimeOffset.UtcNow.AddDays(20), RevocadoEn = revocadoAntes },
            new RefreshToken { UsuarioId = Escenario.DuenoId, TokenHash = "d", ExpiraEn = DateTimeOffset.UtcNow.AddDays(20) });
        await e.Db.SaveChangesAsync();
        var servicio = e.AdminUsuarios();

        var desactivado = await servicio.CambiarActivoAsync(2, new CambiarActivoRequest(false));

        Assert.False(desactivado.Activo);
        var tokens = await e.Db.RefreshTokens.ToListAsync();
        Assert.All(tokens.Where(t => t.UsuarioId == 2), t => Assert.NotNull(t.RevocadoEn));
        Assert.Equal(revocadoAntes, tokens.Single(t => t.TokenHash == "c").RevocadoEn);
        Assert.Null(tokens.Single(t => t.TokenHash == "d").RevocadoEn);

        var reactivado = await servicio.CambiarActivoAsync(2, new CambiarActivoRequest(true));
        Assert.True(reactivado.Activo);
        Assert.All(await e.Db.RefreshTokens.Where(t => t.UsuarioId == 2).ToListAsync(), t => Assert.NotNull(t.RevocadoEn));
    }

    [Fact]
    public async Task La_lista_de_usuarios_busca_sin_distinguir_mayusculas_y_cuenta_alimentadores_y_gateways()
    {
        using var e = new Escenario();
        e.Gateway.PropietarioId = Escenario.DuenoId;
        await e.Db.SaveChangesAsync();
        e.AgregarUsuario(2);

        var pagina = await e.AdminUsuarios().ListarAsync(new ConsultaUsuarios { Buscar = "DIEGO" });

        Assert.Equal(1, pagina.Total);
        var diego = Assert.Single(pagina.Elementos);
        Assert.Equal(Escenario.DuenoId, diego.Id);
        Assert.Equal(1, diego.Alimentadores);
        Assert.Equal(1, diego.Gateways);
        Assert.Equal(2, (await e.AdminUsuarios().ListarAsync(new ConsultaUsuarios())).Total);
    }

    [Fact]
    public async Task El_detalle_del_usuario_trae_membresias_y_gateways()
    {
        using var e = new Escenario();
        e.Gateway.PropietarioId = Escenario.DuenoId;
        await e.Db.SaveChangesAsync();

        var detalle = await e.AdminUsuarios().ObtenerAsync(Escenario.DuenoId);

        var membresia = Assert.Single(detalle.Membresias);
        Assert.Equal(new MembresiaAdminDto(e.Alimentador.Id, Escenario.Feeder, "Cocina", RolAlimentador.Dueno), membresia);
        Assert.Equal(new GatewayResumenDto(e.Gateway.Id, "pi-casa", true), Assert.Single(detalle.ListaGateways));
    }

    // --- Alimentadores ---

    [Fact]
    public async Task Los_alimentadores_se_filtran_por_estado_y_por_correo_del_dueno()
    {
        using var e = new Escenario();
        e.AgregarUsuario(2);
        var ahora = DateTimeOffset.UtcNow;
        e.Alimentador.CreadoEn = ahora.AddDays(-3);
        var enLinea = AgregarAlimentador(e, "feeder02", Escenario.DuenoId, e.Gateway, enLinea: true, creadoEn: ahora.AddDays(-2));
        var sinGateway = AgregarAlimentador(e, "feeder03", 2, creadoEn: ahora.AddDays(-1));
        var servicio = e.AdminAlimentadores();

        var soloEnLinea = await servicio.ListarAsync(new ConsultaAlimentadores { Estado = "enLinea" });
        var sinConexion = await servicio.ListarAsync(new ConsultaAlimentadores { Estado = "sinConexion" });
        var sinPi = await servicio.ListarAsync(new ConsultaAlimentadores { Estado = "sinGateway" });
        var porCorreo = await servicio.ListarAsync(new ConsultaAlimentadores { Buscar = "USUARIO2@" });

        Assert.Equal(new[] { enLinea.Id }, soloEnLinea.Elementos.Select(a => a.Id));
        Assert.Equal(new[] { sinGateway.Id, e.Alimentador.Id }, sinConexion.Elementos.Select(a => a.Id));
        Assert.Equal(new[] { sinGateway.Id }, sinPi.Elementos.Select(a => a.Id));
        Assert.Equal(new[] { sinGateway.Id }, porCorreo.Elementos.Select(a => a.Id));

        var dto = soloEnLinea.Elementos[0];
        Assert.Equal(new UsuarioResumenDto(Escenario.DuenoId, "Diego", "diego@example.com"), dto.Dueno);
        Assert.Equal(new GatewayResumenDto(e.Gateway.Id, "pi-casa", true), dto.Gateway);
        Assert.True(dto.Estado.DispensadoRemotoDisponible);
        Assert.Null(sinPi.Elementos[0].Gateway);
    }

    [Fact]
    public async Task La_lista_de_alimentadores_se_pagina_de_lo_mas_reciente_a_lo_mas_antiguo()
    {
        using var e = new Escenario();
        var ahora = DateTimeOffset.UtcNow;
        e.Alimentador.CreadoEn = ahora.AddDays(-3);
        var medio = AgregarAlimentador(e, "feeder02", Escenario.DuenoId, creadoEn: ahora.AddDays(-2));
        AgregarAlimentador(e, "feeder03", Escenario.DuenoId, creadoEn: ahora.AddDays(-1));

        var pagina = await e.AdminAlimentadores().ListarAsync(new ConsultaAlimentadores { Pagina = 2, Tamano = 1 });

        Assert.Equal(3, pagina.Total);
        Assert.Equal(2, pagina.NumeroPagina);
        Assert.Equal(1, pagina.Tamano);
        Assert.Equal(medio.Id, Assert.Single(pagina.Elementos).Id);
    }

    [Fact]
    public async Task El_detalle_del_alimentador_incluye_mascotas_dadas_de_baja_y_horarios_en_HH_mm()
    {
        using var e = new Escenario();
        var activa = e.AgregarMascota(Especie.Gato, "Michi");
        var baja = e.AgregarMascota(Especie.Perro, "Firulais");
        baja.Activa = false;
        var visita = DateTimeOffset.UtcNow.AddHours(-2);
        e.Db.Visitas.Add(new Visita
        {
            EventId = "boot1-1", AlimentadorId = e.Alimentador.Id, MascotaId = activa.Id, Clase = ClaseDetectada.Gato,
            IniciadaEn = visita, TerminadaEn = visita.AddMinutes(5)
        });
        e.Db.Horarios.Add(new Horario { AlimentadorId = e.Alimentador.Id, Hora = new TimeOnly(8, 0) });
        for (int i = 0; i < 25; i++)
            e.Db.Alertas.Add(new Alerta
            {
                AlimentadorId = e.Alimentador.Id, Tipo = TipoAlerta.TolvaBaja, Mensaje = $"Alerta {i}",
                OcurridaEn = DateTimeOffset.UtcNow, CreadoEn = DateTimeOffset.UtcNow.AddMinutes(-i)
            });
        await e.Db.SaveChangesAsync();
        AgregarComando(e, e.Alimentador.Id, EstadoComando.Completado, TipoComando.Dispensar);

        var detalle = await e.AdminAlimentadores().ObtenerAsync(e.Alimentador.Id);

        Assert.Equal(1, detalle.Mascotas);
        Assert.Equal(2, detalle.ListaMascotas.Count);
        Assert.False(detalle.ListaMascotas.Single(m => m.Id == baja.Id).Activa);
        Assert.Equal(visita, detalle.ListaMascotas.Single(m => m.Id == activa.Id).UltimaVisita);
        Assert.Null(detalle.ListaMascotas.Single(m => m.Id == baja.Id).UltimaVisita);
        Assert.Equal("08:00", Assert.Single(detalle.Horarios).Hora);
        Assert.Equal(20, detalle.UltimasAlertas.Count);
        Assert.Equal("Alerta 0", detalle.UltimasAlertas[0].Mensaje);
        var comando = Assert.Single(detalle.UltimosComandos);
        Assert.Null(comando.Artefacto);
        Assert.Equal(Escenario.Feeder, comando.AlimentadorCodigo);
        Assert.Equal(Escenario.DuenoId, Assert.Single(detalle.ListaMiembros).UsuarioId);
        await Assert.ThrowsAsync<NoEncontradoException>(() => e.AdminAlimentadores().ObtenerAsync(999));
    }

    // --- Resumen ---

    [Fact]
    public async Task El_resumen_cuenta_cada_seccion()
    {
        using var e = new Escenario();
        var ahora = DateTimeOffset.UtcNow;
        e.HacerAdministrador();
        e.AgregarUsuario(2).Activo = false;
        e.AgregarUsuario(3).CreadoEn = ahora.AddDays(-30);
        e.Alimentador.VersionFirmware = "1.0.0";
        e.Alimentador.VersionModelo = "m1";
        var enLinea = AgregarAlimentador(e, "feeder02", Escenario.DuenoId, enLinea: true);
        enLinea.VersionModelo = "m1";
        e.Db.Gateways.Add(new Gateway
        {
            DeviceId = "pi-sala", DeviceKeyHash = "x", UltimoHeartbeat = ahora.AddHours(-1), SincronizandoDesde = ahora
        });
        e.AgregarMascota(Especie.Perro, "Firulais");
        e.AgregarMascota(Especie.Gato, "Michi");
        e.AgregarMascota(Especie.Gato, "Luna").Activa = false;
        e.Db.Alertas.AddRange(
            new Alerta { AlimentadorId = e.Alimentador.Id, Mensaje = "hoy", OcurridaEn = ahora.AddHours(-1) },
            new Alerta { AlimentadorId = e.Alimentador.Id, Mensaje = "antier", OcurridaEn = ahora.AddDays(-2) });
        e.Db.FotosDudosas.AddRange(
            new FotoDudosa { EventId = "f1", AlimentadorId = e.Alimentador.Id, Subida = true },
            new FotoDudosa { EventId = "f2", AlimentadorId = e.Alimentador.Id, Subida = true, ClaseRevisada = ClaseDetectada.Gato },
            new FotoDudosa { EventId = "f3", AlimentadorId = e.Alimentador.Id });
        await e.Db.SaveChangesAsync();
        var artefacto = AgregarArtefacto(e);
        AgregarComando(e, e.Alimentador.Id, EstadoComando.Pendiente, artefacto: artefacto);
        AgregarComando(e, enLinea.Id, EstadoComando.Entregado, artefacto: artefacto);
        AgregarComando(e, e.Alimentador.Id, EstadoComando.Fallido, artefacto: artefacto).CompletadoEn = ahora.AddDays(-1);
        AgregarComando(e, e.Alimentador.Id, EstadoComando.Fallido, artefacto: artefacto).CompletadoEn = ahora.AddDays(-10);
        var cancelado = AgregarComando(e, e.Alimentador.Id, EstadoComando.Fallido, artefacto: artefacto);
        cancelado.Error = Comando.ErrorCancelado;
        cancelado.CompletadoEn = ahora;
        AgregarComando(e, e.Alimentador.Id, EstadoComando.Pendiente, TipoComando.Dispensar);
        await e.Db.SaveChangesAsync();

        var resumen = await e.AdminResumen().ObtenerAsync();

        Assert.Equal(new ResumenUsuariosDto(3, 2, 1, 2), resumen.Usuarios);
        Assert.Equal(new ResumenAlimentadoresDto(2, 1, 1, 1), resumen.Alimentadores);
        Assert.Equal(new ResumenGatewaysDto(2, 1, 1, 1), resumen.Gateways);
        Assert.Equal(new ResumenMascotasDto(2, 1, 1), resumen.Mascotas);
        Assert.Equal(1, resumen.Alertas24h);
        Assert.Equal(new ResumenOtaDto(1, 2, 1), resumen.Ota);
        Assert.Equal(1, resumen.FotosPorRevisar);
        Assert.Equal(new[] { new VersionConteoDto("1.0.0", 1), new VersionConteoDto(null, 1) }, resumen.VersionesFirmware);
        Assert.Equal(new[] { new VersionConteoDto("m1", 2) }, resumen.VersionesModelo);
    }

    // --- Embebidos ---

    [Fact]
    public async Task Los_gateways_se_listan_por_device_id_con_sus_alimentadores()
    {
        using var e = new Escenario();
        e.AgregarUsuario(2);
        e.Db.Gateways.Add(new Gateway
        {
            DeviceId = "pi-sala", DeviceKeyHash = "x", PropietarioId = 2,
            UltimoHeartbeat = DateTimeOffset.UtcNow, SinConexionDesde = DateTimeOffset.UtcNow.AddMinutes(-20)
        });
        e.Alimentador.VersionFirmware = "1.2.0";
        await e.Db.SaveChangesAsync();

        var gateways = await e.AdminEmbebidos().ListarGatewaysAsync();

        Assert.Equal(new[] { "pi-casa", "pi-sala" }, gateways.Select(g => g.DeviceId));
        Assert.True(gateways[0].EnLinea);
        Assert.Null(gateways[0].Propietario);
        var esp32 = Assert.Single(gateways[0].Alimentadores);
        Assert.Equal(Escenario.Feeder, esp32.Codigo);
        Assert.Equal("1.2.0", esp32.VersionFirmware);
        Assert.False(gateways[1].EnLinea);
        Assert.Equal(2, gateways[1].Propietario!.Id);
        Assert.Empty(gateways[1].Alimentadores);
    }

    [Fact]
    public async Task El_administrador_regenera_la_clave_de_una_pi_ajena()
    {
        using var e = new Escenario();
        e.AgregarUsuario(2);
        e.Gateway.PropietarioId = 2;
        await e.Db.SaveChangesAsync();

        var respuesta = await e.AdminEmbebidos().RegenerarClaveAsync(e.Gateway.Id);

        Assert.Equal("pi-casa", respuesta.DeviceId);
        Assert.False(string.IsNullOrEmpty(respuesta.Clave));
        Assert.NotEqual("x", e.Gateway.DeviceKeyHash);
        Assert.NotEqual(respuesta.Clave, e.Gateway.DeviceKeyHash);
        await Assert.ThrowsAsync<NoEncontradoException>(() => e.AdminEmbebidos().RegenerarClaveAsync(999));
    }

    [Fact]
    public async Task Los_eventos_se_filtran_por_tipo_del_mas_reciente_al_mas_antiguo()
    {
        using var e = new Escenario();
        var ahora = DateTimeOffset.UtcNow;
        e.Db.Eventos.AddRange(
            new EventoAlimentador { EventId = "e1", AlimentadorId = e.Alimentador.Id, Tipo = TipoEvento.Jam, OcurridoEn = ahora.AddHours(-2), Tolva = 1 },
            new EventoAlimentador { EventId = "e2", AlimentadorId = e.Alimentador.Id, Tipo = TipoEvento.HopperLow, OcurridoEn = ahora.AddHours(-1) },
            new EventoAlimentador { EventId = "e3", AlimentadorId = e.Alimentador.Id, Tipo = TipoEvento.Jam, OcurridoEn = ahora });
        await e.Db.SaveChangesAsync();

        var atascos = await e.AdminEmbebidos().ListarEventosAsync(new ConsultaEventos { Tipo = TipoEvento.Jam });

        Assert.Equal(2, atascos.Total);
        Assert.Equal(new[] { ahora, ahora.AddHours(-2) }, atascos.Elementos.Select(x => x.OcurridoEn));
        Assert.All(atascos.Elementos, x => Assert.Equal(Escenario.Feeder, x.AlimentadorCodigo));
    }

    [Fact]
    public async Task Revisar_una_foto_la_saca_de_pendientes()
    {
        using var e = new Escenario();
        var ahora = DateTimeOffset.UtcNow;
        var pendiente = new FotoDudosa { EventId = "f1", AlimentadorId = e.Alimentador.Id, Subida = true, TomadaEn = ahora, ClasePredicha = ClaseDetectada.Gato, Confianza = 0.6 };
        var sinSubir = new FotoDudosa { EventId = "f2", AlimentadorId = e.Alimentador.Id, TomadaEn = ahora.AddMinutes(-1) };
        e.Db.FotosDudosas.AddRange(pendiente, sinSubir);
        await e.Db.SaveChangesAsync();
        var servicio = e.AdminEmbebidos();

        var antes = await servicio.ListarFotosAsync(new ConsultaFotos());
        var dto = Assert.Single(antes.Elementos);
        Assert.Equal(pendiente.Id, dto.Id);
        Assert.NotNull(dto.Url);

        var revisada = await servicio.RevisarFotoAsync(pendiente.Id, new RevisarFotoRequest(ClaseDetectada.Perro));

        Assert.Equal(ClaseDetectada.Perro, revisada.ClaseRevisada);
        Assert.Equal(ClaseDetectada.Gato, revisada.ClasePredicha);
        Assert.Empty((await servicio.ListarFotosAsync(new ConsultaFotos { Estado = "pendientes" })).Elementos);
        Assert.Equal(pendiente.Id, Assert.Single((await servicio.ListarFotosAsync(new ConsultaFotos { Estado = "revisadas" })).Elementos).Id);
        var todas = await servicio.ListarFotosAsync(new ConsultaFotos { Estado = "todas" });
        Assert.Equal(2, todas.Total);
        Assert.Null(todas.Elementos.Single(f => f.Id == sinSubir.Id).Url);
        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => servicio.RevisarFotoAsync(sinSubir.Id, new RevisarFotoRequest(ClaseDetectada.Nada)));
    }

    // --- Despliegues OTA ---

    [Fact]
    public async Task El_despliegue_crea_comandos_y_omite_cada_caso_con_su_motivo()
    {
        using var e = new Escenario();
        e.HacerAdministrador();
        var artefacto = AgregarArtefacto(e, TipoArtefactoOta.Firmware, "1.2.0");
        e.Alimentador.VersionFirmware = "1.1.0";
        var actualizado = AgregarAlimentador(e, "feeder02", Escenario.DuenoId);
        actualizado.VersionFirmware = "1.2.0";
        var enCurso = AgregarAlimentador(e, "feeder03", Escenario.DuenoId);
        // Tiene la versión como modelo, no como firmware: sí se actualiza
        var otroTipo = AgregarAlimentador(e, "feeder04", Escenario.DuenoId);
        otroTipo.VersionModelo = "1.2.0";
        await e.Db.SaveChangesAsync();
        AgregarComando(e, enCurso.Id, EstadoComando.Entregado, artefacto: AgregarArtefacto(e, version: "1.0.0"));

        var respuesta = await e.AdminOta().DesplegarAsync(new CrearDespliegueOtaRequest(
            artefacto.Id, [e.Alimentador.Id, 999, actualizado.Id, enCurso.Id, otroTipo.Id], OmitirSiYaTieneVersion: true));

        Assert.Equal(new[] { e.Alimentador.Id, otroTipo.Id }, respuesta.Creados.Select(c => c.AlimentadorId));
        Assert.All(respuesta.Creados, c =>
        {
            Assert.Equal(TipoComando.Ota, c.Tipo);
            Assert.Equal(EstadoComando.Pendiente, c.Estado);
            Assert.Equal(new ArtefactoResumenDto(artefacto.Id, TipoArtefactoOta.Firmware, "1.2.0"), c.Artefacto);
            Assert.Equal(new UsuarioMinimoDto(Escenario.DuenoId, "Diego"), c.SolicitadoPor);
        });
        Assert.Equal(
            new[]
            {
                new DespliegueOmitidoDto(999, AdminOtaService.MotivoNoExiste),
                new DespliegueOmitidoDto(actualizado.Id, "Ya tiene esa versión."),
                new DespliegueOmitidoDto(enCurso.Id, "Ya tiene una actualización en curso.")
            },
            respuesta.Omitidos);
        Assert.Equal(new[] { e.Alimentador.Id, otroTipo.Id }, e.Notificador.Comandos.Select(n => n.AlimentadorId));
        Assert.Equal(2, await e.Db.Comandos.CountAsync(c => c.ArtefactoOtaId == artefacto.Id && c.SolicitadoPorId == Escenario.DuenoId));
    }

    [Fact]
    public async Task Sin_omitir_por_version_se_reinstala_la_misma()
    {
        using var e = new Escenario();
        var artefacto = AgregarArtefacto(e, TipoArtefactoOta.Modelo, "m1");
        e.Alimentador.VersionModelo = "m1";
        await e.Db.SaveChangesAsync();

        var respuesta = await e.AdminOta().DesplegarAsync(
            new CrearDespliegueOtaRequest(artefacto.Id, [e.Alimentador.Id], OmitirSiYaTieneVersion: false));

        Assert.Single(respuesta.Creados);
        Assert.Empty(respuesta.Omitidos);
        await Assert.ThrowsAsync<NoEncontradoException>(() => e.AdminOta().DesplegarAsync(
            new CrearDespliegueOtaRequest(999, [e.Alimentador.Id], OmitirSiYaTieneVersion: false)));
    }

    [Fact]
    public async Task Solo_se_cancela_una_ota_pendiente()
    {
        using var e = new Escenario();
        var artefacto = AgregarArtefacto(e);
        var pendiente = AgregarComando(e, e.Alimentador.Id, EstadoComando.Pendiente, artefacto: artefacto);
        var entregado = AgregarComando(e, e.Alimentador.Id, EstadoComando.Entregado, artefacto: artefacto);
        var dispensado = AgregarComando(e, e.Alimentador.Id, EstadoComando.Pendiente, TipoComando.Dispensar);
        var servicio = e.AdminOta();

        var cancelado = await servicio.CancelarAsync(pendiente.Id);

        Assert.Equal(EstadoComando.Fallido, cancelado.Estado);
        Assert.Equal("Cancelado por un administrador.", cancelado.Error);
        Assert.NotNull(cancelado.CompletadoEn);
        Assert.Equal(pendiente.Id, Assert.Single(e.Notificador.Comandos).Comando.Id);
        await Assert.ThrowsAsync<ConflictoException>(() => servicio.CancelarAsync(entregado.Id));
        await Assert.ThrowsAsync<ConflictoException>(() => servicio.CancelarAsync(pendiente.Id));
        await Assert.ThrowsAsync<NoEncontradoException>(() => servicio.CancelarAsync(dispensado.Id));
        Assert.Equal(EstadoComando.Entregado, entregado.Estado);
    }

    [Fact]
    public async Task La_lista_de_despliegues_solo_trae_ota_y_respeta_los_filtros()
    {
        using var e = new Escenario();
        var artefacto = AgregarArtefacto(e);
        var otro = AgregarAlimentador(e, "feeder02", Escenario.DuenoId);
        var pendiente = AgregarComando(e, e.Alimentador.Id, EstadoComando.Pendiente, artefacto: artefacto);
        AgregarComando(e, e.Alimentador.Id, EstadoComando.Completado, artefacto: artefacto);
        AgregarComando(e, otro.Id, EstadoComando.Pendiente, artefacto: artefacto);
        AgregarComando(e, e.Alimentador.Id, EstadoComando.Pendiente, TipoComando.Dispensar);
        var servicio = e.AdminOta();

        var todas = await servicio.ListarAsync(new ConsultaDespliegues());
        var filtradas = await servicio.ListarAsync(new ConsultaDespliegues
        {
            Estado = EstadoComando.Pendiente, AlimentadorId = e.Alimentador.Id, ArtefactoId = artefacto.Id
        });

        Assert.Equal(3, todas.Total);
        Assert.All(todas.Elementos, c => Assert.Equal(TipoComando.Ota, c.Tipo));
        Assert.Equal(pendiente.Id, Assert.Single(filtradas.Elementos).Id);
    }

    // --- Validación ---

    [Theory]
    [InlineData(1, 25, true)]
    [InlineData(1, 100, true)]
    [InlineData(0, 25, false)]
    [InlineData(1, 0, false)]
    [InlineData(1, 101, false)]
    public void La_paginacion_va_de_1_a_100(int pagina, int tamano, bool valida)
        => Assert.Equal(valida, new ConsultaUsuariosValidator().Validate(new ConsultaUsuarios { Pagina = pagina, Tamano = tamano }).IsValid);

    [Theory]
    [InlineData(null, true)]
    [InlineData("ENLINEA", true)]
    [InlineData("sinGateway", true)]
    [InlineData("apagado", false)]
    public void El_estado_de_alimentadores_es_uno_de_los_permitidos(string? estado, bool valido)
        => Assert.Equal(valido, new ConsultaAlimentadoresValidator().Validate(new ConsultaAlimentadores { Estado = estado }).IsValid);

    [Fact]
    public void El_despliegue_exige_de_1_a_200_ids_sin_repetir()
    {
        var validador = new CrearDespliegueOtaValidator();

        Assert.True(validador.Validate(new CrearDespliegueOtaRequest(1, Enumerable.Range(1, 200).ToList(), true)).IsValid);
        Assert.False(validador.Validate(new CrearDespliegueOtaRequest(1, [], true)).IsValid);
        Assert.False(validador.Validate(new CrearDespliegueOtaRequest(1, Enumerable.Range(1, 201).ToList(), true)).IsValid);
        Assert.False(validador.Validate(new CrearDespliegueOtaRequest(1, [4, 5, 4], true)).IsValid);
        Assert.False(validador.Validate(new CrearDespliegueOtaRequest(1, null!, true)).IsValid);
    }
}
