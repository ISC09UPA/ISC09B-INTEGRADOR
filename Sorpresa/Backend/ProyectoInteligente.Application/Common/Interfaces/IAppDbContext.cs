using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<Rol> Roles { get; }
    DbSet<Usuario> Usuarios { get; }
    DbSet<Doctor> Doctores { get; }
    DbSet<Consultorio> Consultorios { get; }
    DbSet<Cita> Citas { get; }
    DbSet<Turno> Turnos { get; }
    DbSet<TagRfid> TagsRfid { get; }
    DbSet<Acceso> Accesos { get; }
    DbSet<Alerta> Alertas { get; }
    DbSet<Configuracion> Configuraciones { get; }
    DbSet<EventoPendiente> EventosPendientes { get; }
    DbSet<OcupacionSala> OcupacionesSala { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
