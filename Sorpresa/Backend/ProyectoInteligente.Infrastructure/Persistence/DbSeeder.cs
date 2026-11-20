using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Domain.Entities;
using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.Roles.AnyAsync()) return;

        var rolAdmin = new Rol { Nombre = "admin" };
        var rolDoctor = new Rol { Nombre = "doctor" };
        var rolPaciente = new Rol { Nombre = "paciente" };
        var c1 = new Consultorio { Nombre = "Consultorio 1" };
        db.Roles.AddRange(rolAdmin, rolDoctor, rolPaciente);
        db.Consultorios.Add(c1);
        await db.SaveChangesAsync();

        var hash = BCrypt.Net.BCrypt.HashPassword("Demo1234!");
        var admin = new Usuario { Nombre = "Administrador", Correo = "admin@demo.com", PasswordHash = hash, RolId = rolAdmin.Id };
        var ana = new Usuario { Nombre = "Dra. Ana Torres", Correo = "doctor@demo.com", PasswordHash = hash, RolId = rolDoctor.Id };
        var maria = new Usuario { Nombre = "María López", Correo = "paciente@demo.com", PasswordHash = hash, RolId = rolPaciente.Id };
        var jorge = new Usuario { Nombre = "Jorge Ramos", Correo = "jorge@demo.com", PasswordHash = hash, RolId = rolPaciente.Id };
        var elena = new Usuario { Nombre = "Elena Cruz", Correo = "elena@demo.com", PasswordHash = hash, RolId = rolPaciente.Id };
        db.Usuarios.AddRange(admin, ana, maria, jorge, elena);
        await db.SaveChangesAsync();

        db.Doctores.Add(new Doctor { UsuarioId = ana.Id, ConsultorioId = c1.Id, Especialidad = "Medicina general" });
        db.TagsRfid.AddRange(
            new TagRfid { Uid = "7C:11:90:A1", UsuarioId = ana.Id },
            new TagRfid { Uid = "9D:42:E7:03", UsuarioId = maria.Id },
            new TagRfid { Uid = "3B:F0:22:5E", UsuarioId = jorge.Id },
            new TagRfid { Uid = "5A:19:C4:77", UsuarioId = elena.Id });
        db.Configuraciones.Add(new Configuracion { Clave = "capacidad_sala", Valor = "8" });
        await db.SaveChangesAsync();

        var ahora = DateTime.UtcNow;
        var cita1 = new Cita { PacienteId = maria.Id, DoctorId = ana.Id, ConsultorioId = c1.Id, FechaHora = ahora.AddMinutes(30) };
        var cita2 = new Cita { PacienteId = jorge.Id, DoctorId = ana.Id, ConsultorioId = c1.Id, FechaHora = ahora.AddMinutes(-15) };
        var cita3 = new Cita { PacienteId = elena.Id, DoctorId = ana.Id, ConsultorioId = c1.Id, FechaHora = ahora };
        db.Citas.AddRange(cita1, cita2, cita3);
        await db.SaveChangesAsync();

        db.Turnos.AddRange(
            new Turno { Codigo = "A-014", CitaId = cita2.Id, PacienteId = jorge.Id, ConsultorioId = c1.Id, Estado = EstadoTurno.EnConsulta,
                        LlegadaEn = ahora.AddMinutes(-40), LlamadoEn = ahora.AddMinutes(-27), InicioConsulta = ahora.AddMinutes(-25) },
            new Turno { Codigo = "A-015", CitaId = cita3.Id, PacienteId = elena.Id, ConsultorioId = c1.Id, LlegadaEn = ahora.AddMinutes(-20) },
            new Turno { Codigo = "A-016", CitaId = cita1.Id, PacienteId = maria.Id, ConsultorioId = c1.Id, LlegadaEn = ahora.AddMinutes(-5) });
        await db.SaveChangesAsync();
    }
}
