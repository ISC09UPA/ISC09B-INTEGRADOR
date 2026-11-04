using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Domain.ValueObjects;
using EstacionamientoInteligente.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EstacionamientoInteligente.Infrastructure.DAOs;

/// <summary>Consultas a la tabla <c>Vehiculos</c>.</summary>
public class VehiculoDao(EstacionamientoDbContext db) : IVehiculoDao
{
    public Task<Vehiculo?> ObtenerPorIdAsync(Guid id) =>
        db.Vehiculos
            .Include(v => v.Usuario)
            .FirstOrDefaultAsync(v => v.Id == id);

    /// <summary>Compara por <c>placa_clave</c>, así "ABC-123-A" y "abc123a" son la misma placa.</summary>
    public Task<Vehiculo?> ObtenerPorPlacaAsync(Placa placa)
    {
        var clave = placa.Clave;
        return db.Vehiculos
            .Include(v => v.Usuario)
            .FirstOrDefaultAsync(v => v.Placa!.Clave == clave);
    }

    /// <remarks>
    /// Filtros: <b>Dentro</b> = tiene un acceso abierto (sin importar si está de baja, porque la baja no impide entrar);
    /// <b>Fuera</b> = activo y sin acceso abierto; <b>Baja</b> = dado de baja.
    /// </remarks>
    public async Task<IReadOnlyList<Vehiculo>> BuscarAsync(string? textoPlaca, FiltroVehiculos filtro)
    {
        IQueryable<Vehiculo> consulta = db.Vehiculos.Include(v => v.Usuario);

        if (!string.IsNullOrWhiteSpace(textoPlaca))
        {
            // Se busca sin guiones ni espacios: "123 a" encuentra "ABC-123-A".
            var clave = Placa.ObtenerClave(textoPlaca);
            if (clave.Length > 0)
                consulta = consulta.Where(v => v.Placa!.Clave.Contains(clave));
        }

        consulta = filtro switch
        {
            FiltroVehiculos.Dentro => consulta.Where(v =>
                db.Accesos.Any(a => a.VehiculoId == v.Id && a.HoraSalida == null)),
            FiltroVehiculos.Fuera => consulta.Where(v =>
                v.Estado == EstadoVehiculo.Alta &&
                !db.Accesos.Any(a => a.VehiculoId == v.Id && a.HoraSalida == null)),
            FiltroVehiculos.Baja => consulta.Where(v => v.Estado == EstadoVehiculo.Baja),
            _ => consulta
        };

        return await consulta
            .OrderByDescending(v => v.FechaAlta)
            .ToListAsync();
    }

    public void Agregar(Vehiculo vehiculo) => db.Vehiculos.Add(vehiculo);
}
