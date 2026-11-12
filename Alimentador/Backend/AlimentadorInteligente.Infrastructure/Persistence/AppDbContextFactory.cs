using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AlimentadorInteligente.Infrastructure.Persistence;

/// <summary>
/// La usa solo `dotnet ef` (migraciones). Así no hace falta arrancar la API ni tener Jwt:Key.
/// Toma la conexión de la variable ConnectionStrings__Postgres; si no existe, usa la de docker-compose.yml.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string ConexionDesarrollo =
        "Host=localhost;Port=5432;Database=alimentador;Username=postgres;Password=postgres";

    public AppDbContext CreateDbContext(string[] args)
    {
        var conexion = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres");
        var opciones = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(string.IsNullOrWhiteSpace(conexion) ? ConexionDesarrollo : conexion)
            .Options;
        return new AppDbContext(opciones);
    }
}
