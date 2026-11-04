using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Infrastructure.Persistence;
using AlmacenInteligente.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AlmacenInteligente.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string cadenaConexion)
    {
        // Reintentos: la base serverless tarda unos segundos en "despertar" tras la pausa automática.
        services.AddDbContext<AlmacenDbContext>(opciones =>
            opciones.UseSqlServer(cadenaConexion, sql => sql.EnableRetryOnFailure()));

        services.AddScoped<IProductoRepository, ProductoRepository>();
        return services;
    }
}
