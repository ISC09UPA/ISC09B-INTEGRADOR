using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Usuario> Usuarios { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Gateway> Gateways { get; }
    DbSet<Alimentador> Alimentadores { get; }
    DbSet<MiembroAlimentador> MiembrosAlimentador { get; }
    DbSet<Mascota> Mascotas { get; }
    DbSet<Horario> Horarios { get; }
    DbSet<Visita> Visitas { get; }
    DbSet<EventoAlimentador> Eventos { get; }
    DbSet<Alerta> Alertas { get; }
    DbSet<Comando> Comandos { get; }
    DbSet<AjusteRacion> AjustesRacion { get; }
    DbSet<FotoDudosa> FotosDudosas { get; }
    DbSet<ArtefactoOta> ArtefactosOta { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
