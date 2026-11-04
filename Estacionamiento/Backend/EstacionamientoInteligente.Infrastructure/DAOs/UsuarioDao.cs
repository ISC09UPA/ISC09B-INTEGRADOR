using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EstacionamientoInteligente.Infrastructure.DAOs;

/// <summary>Consultas a la tabla <c>Usuarios</c>.</summary>
public class UsuarioDao(EstacionamientoDbContext db) : IUsuarioDao
{
    /// <summary>Incluye sus vehículos, para la pantalla de Perfil.</summary>
    public Task<Usuario?> ObtenerPorIdAsync(Guid id) =>
        db.Usuarios
            .Include(u => u.Vehiculos)
            .FirstOrDefaultAsync(u => u.Id == id);

    public Task<Usuario?> ObtenerPorCorreoAsync(string correo) =>
        db.Usuarios.FirstOrDefaultAsync(u => u.Correo == correo);

    public Task<bool> ExisteCorreoAsync(string correo) =>
        db.Usuarios.AnyAsync(u => u.Correo == correo);

    public void Agregar(Usuario usuario) => db.Usuarios.Add(usuario);
}
