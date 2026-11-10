using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Services;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace AlimentadorInteligente.Tests;

internal sealed class NotificadorFalso : INotificadorTiempoReal
{
    public Task VisitaRegistradaAsync(int alimentadorId, VisitaDto visita, CancellationToken ct = default) => Task.CompletedTask;
    public Task AlertaCreadaAsync(int alimentadorId, AlertaDto alerta, CancellationToken ct = default) => Task.CompletedTask;
    public Task ComandoActualizadoAsync(int alimentadorId, ComandoDto comando, CancellationToken ct = default) => Task.CompletedTask;
    public Task EstadoAlimentadorAsync(int alimentadorId, EstadoAlimentadorDto estado, CancellationToken ct = default) => Task.CompletedTask;
}

internal sealed class PushFalso : IPushService
{
    public Task EnviarAsync(IEnumerable<string> expoTokens, string titulo, string cuerpo, CancellationToken ct = default)
        => Task.CompletedTask;
}

internal sealed class ArchivosFalsos : IAlmacenamientoArchivos
{
    public Uri GenerarUrlSubida(string contenedor, string blobNombre, TimeSpan vigencia) => new("https://prueba.local/subida");
    public Uri GenerarUrlDescarga(string contenedor, string blobNombre, TimeSpan vigencia) => new("https://prueba.local/descarga");
}

internal sealed class UsuarioFalso(int id) : IUsuarioActual
{
    public int Id => id;
}

/// <summary>Base en memoria con un dueño, una Pi conectada y un alimentador.</summary>
internal sealed class Escenario : IDisposable
{
    public const int DuenoId = 1;
    public const string Feeder = "feeder01";

    public AppDbContext Db { get; }
    public Gateway Gateway { get; }
    public Alimentador Alimentador { get; }

    public Escenario()
    {
        Db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        Gateway = new Gateway { DeviceId = "pi-casa", DeviceKeyHash = "x", UltimoHeartbeat = DateTimeOffset.UtcNow };
        Alimentador = new Alimentador { Codigo = Feeder, Nombre = "Cocina", Gateway = Gateway };
        Alimentador.Miembros.Add(new MiembroAlimentador
        {
            UsuarioId = DuenoId,
            Usuario = new Usuario { Id = DuenoId, Nombre = "Diego", Email = "diego@example.com", PasswordHash = "x" },
            Rol = Domain.Enums.RolAlimentador.Dueno
        });
        Db.Alimentadores.Add(Alimentador);
        Db.SaveChanges();
    }

    public Mascota AgregarMascota(Domain.Enums.Especie especie, string nombre = "Michi", string? rfid = null)
    {
        var mascota = new Mascota
        {
            AlimentadorId = Alimentador.Id,
            Nombre = nombre,
            Especie = especie,
            PesoKg = 4,
            EtiquetaRfid = rfid,
            CreadoEn = DateTimeOffset.UtcNow.AddDays(-2)
        };
        Db.Mascotas.Add(mascota);
        Db.SaveChanges();
        return mascota;
    }

    private AlertaService Alertas() => new(Db, null!, new NotificadorFalso(), new PushFalso());

    public DispositivoService Dispositivo() => new(
        Db, Alertas(), new NotificadorFalso(), new ArchivosFalsos(), NullLogger<DispositivoService>.Instance);

    public MonitoreoService Monitoreo() => new(Db, Alertas(), new NotificadorFalso(), TimeProvider.System);

    public MascotaService Mascotas()
        => new(Db, new AccesoAlimentador(Db, new UsuarioFalso(DuenoId)));

    public void Dispose() => Db.Dispose();
}
