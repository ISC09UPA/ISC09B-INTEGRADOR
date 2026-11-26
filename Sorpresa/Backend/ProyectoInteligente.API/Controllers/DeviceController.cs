using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Domain.Entities;
using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/v1/device")]
public class DeviceController(IAppDbContext db, IConfiguration config) : ControllerBase
{
    private bool KeyOk()
    {
        var expected = config["Device:ApiKey"];
        var sent = Request.Headers["X-Device-Key"].ToString();
        return !string.IsNullOrEmpty(expected) &&
               CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(sent));
    }

    [HttpPost("scan")]
    public async Task<IActionResult> Scan(ScanRequest req, CancellationToken ct)
    {
        if (!KeyOk()) return Unauthorized();

        var tag = await db.TagsRfid.FirstOrDefaultAsync(t => t.Uid == req.UidLeido, ct);
        var usuarioId = tag?.UsuarioId;

        var acceso = new Acceso
        {
            TagId = tag?.Id,
            UsuarioId = usuarioId,
            UidLeido = req.UidLeido,
            Presencia = req.Presencia,
            Resultado = req.Resultado,
            Motivo = req.Motivo,
            CreadoEn = req.CreadoEn?.ToUniversalTime() ?? DateTime.UtcNow,
            Sincronizado = true
        };
        db.Accesos.Add(acceso);

        if (req.Resultado == ResultadoAcceso.Denegado)
            db.Alertas.Add(new Alerta
            {
                Tipo = TipoAlerta.AccesoDenegado,
                Mensaje = $"Acceso denegado: {req.UidLeido} ({req.Motivo})",
                Acceso = acceso,
                CreadoEn = acceso.CreadoEn
            });

        string? codigo = null;
        if (req.Resultado == ResultadoAcceso.Concedido && usuarioId is int pacienteId)
        {
            var esPaciente = await db.Usuarios.AnyAsync(u => u.Id == pacienteId && u.Rol.Nombre == "paciente", ct);
            if (esPaciente)
            {
                var turno = await db.Turnos.FirstOrDefaultAsync(t => t.PacienteId == pacienteId && t.Estado != EstadoTurno.Finalizado, ct);
                if (turno == null)
                {
                    turno = new Turno
                    {
                        Codigo = "",
                        PacienteId = pacienteId,
                        ConsultorioId = await db.Consultorios.OrderBy(c => c.Id).Select(c => c.Id).FirstAsync(ct),
                        LlegadaEn = acceso.CreadoEn
                    };
                    db.Turnos.Add(turno);
                    await db.SaveChangesAsync(ct);          // the identity Id is needed for the code
                    turno.Codigo = $"T-{turno.Id:000}";
                }
                codigo = turno.Codigo;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { acceso.Id, turno = codigo });
    }

    [HttpPost("occupancy")]
    public async Task<IActionResult> Occupancy(OccupancyRequest req, CancellationToken ct)
    {
        if (!KeyOk()) return Unauthorized();

        db.OcupacionesSala.Add(new OcupacionSala { Personas = req.Personas, FotoUrl = req.FotoUrl });

        var valor = await db.Configuraciones.Where(c => c.Clave == "capacidad_sala").Select(c => c.Valor).FirstOrDefaultAsync(ct);
        if (int.TryParse(valor, out var capacidad) && req.Personas >= capacidad
            && !await db.Alertas.AnyAsync(a => a.Tipo == TipoAlerta.SalaLlena && !a.Leida, ct))
            db.Alertas.Add(new Alerta { Tipo = TipoAlerta.SalaLlena, Mensaje = $"Sala llena: {req.Personas} personas (capacidad {capacidad})" });

        await db.SaveChangesAsync(ct);
        return Ok();
    }
}
