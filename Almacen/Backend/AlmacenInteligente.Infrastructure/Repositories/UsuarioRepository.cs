using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class UsuarioRepository(AlmacenDbContext db) : IUsuarioRepository
{
    public Task<Usuario?> ObtenerPorNombreUsuarioAsync(string nombreUsuario, CancellationToken ct = default) =>
        db.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.NombreUsuario == nombreUsuario, ct);

    public Task<List<Usuario>> ListarActivosAsync(CancellationToken ct = default) =>
        db.Usuarios
            .AsNoTracking()
            .Where(u => u.Activo)
            .OrderBy(u => u.Id)
            .ToListAsync(ct);

    public Task<Usuario?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
        db.Usuarios.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<bool> ExisteNombreUsuarioAsync(string nombreUsuario, CancellationToken ct = default) =>
        db.Usuarios.AnyAsync(u => u.NombreUsuario == nombreUsuario, ct);

    public Task<int> ContarActivosPorRolAsync(string rol, CancellationToken ct = default) =>
        db.Usuarios.CountAsync(u => u.Activo && u.Rol == rol, ct);

    public void Agregar(Usuario usuario) => db.Usuarios.Add(usuario);

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
