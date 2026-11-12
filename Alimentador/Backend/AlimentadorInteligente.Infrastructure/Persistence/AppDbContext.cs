using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Gateway> Gateways => Set<Gateway>();
    public DbSet<Alimentador> Alimentadores => Set<Alimentador>();
    public DbSet<MiembroAlimentador> MiembrosAlimentador => Set<MiembroAlimentador>();
    public DbSet<Mascota> Mascotas => Set<Mascota>();
    public DbSet<Horario> Horarios => Set<Horario>();
    public DbSet<Visita> Visitas => Set<Visita>();
    public DbSet<EventoAlimentador> Eventos => Set<EventoAlimentador>();
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<Comando> Comandos => Set<Comando>();
    public DbSet<AjusteRacion> AjustesRacion => Set<AjusteRacion>();
    public DbSet<FotoDudosa> FotosDudosas => Set<FotoDudosa>();
    public DbSet<ArtefactoOta> ArtefactosOta => Set<ArtefactoOta>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
        => modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        => configurationBuilder.Properties<Enum>().HaveConversion<string>().HaveMaxLength(30);
}
