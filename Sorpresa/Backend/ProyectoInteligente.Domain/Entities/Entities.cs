using ProyectoInteligente.Domain.Enums;

namespace ProyectoInteligente.Domain.Entities;

public class Rol { public int Id { get; set; } public string Nombre { get; set; } = ""; }

public class Consultorio { public int Id { get; set; } public string Nombre { get; set; } = ""; }

public class Usuario
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public int RolId { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; }
    public Rol Rol { get; set; } = null!;
}

public class Doctor
{
    public int UsuarioId { get; set; }
    public int ConsultorioId { get; set; }
    public string? Especialidad { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public Consultorio Consultorio { get; set; } = null!;
}

public class Cita
{
    public int Id { get; set; }
    public int PacienteId { get; set; }
    public int DoctorId { get; set; }
    public int ConsultorioId { get; set; }
    public DateTime FechaHora { get; set; }
    public EstadoCita Estado { get; set; } = EstadoCita.Agendada;
    public Usuario Paciente { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
    public Consultorio Consultorio { get; set; } = null!;
}

public class Turno
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";
    public int? CitaId { get; set; }
    public int PacienteId { get; set; }
    public int ConsultorioId { get; set; }
    public EstadoTurno Estado { get; set; } = EstadoTurno.EnEspera;
    public DateTime LlegadaEn { get; set; }
    public DateTime? LlamadoEn { get; set; }
    public DateTime? InicioConsulta { get; set; }
    public DateTime? FinConsulta { get; set; }
    public Cita? Cita { get; set; }
    public Usuario Paciente { get; set; } = null!;
    public Consultorio Consultorio { get; set; } = null!;
}

public class TagRfid
{
    public int Id { get; set; }
    public string Uid { get; set; } = "";
    public int? UsuarioId { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; }
    public Usuario? Usuario { get; set; }
}

public class Acceso
{
    public long Id { get; set; }
    public int? TagId { get; set; }
    public string UidLeido { get; set; } = "";
    public int? UsuarioId { get; set; }
    public bool Presencia { get; set; }
    public ResultadoAcceso Resultado { get; set; }
    public string? Motivo { get; set; }
    public DateTime CreadoEn { get; set; }
    public bool Sincronizado { get; set; }
    public TagRfid? Tag { get; set; }
    public Usuario? Usuario { get; set; }
}

public class Alerta
{
    public int Id { get; set; }
    public TipoAlerta Tipo { get; set; }
    public string Mensaje { get; set; } = "";
    public long? AccesoId { get; set; }
    public bool Leida { get; set; }
    public DateTime CreadoEn { get; set; }
    public Acceso? Acceso { get; set; }
}

public class Configuracion { public string Clave { get; set; } = ""; public string Valor { get; set; } = ""; }

public class EventoPendiente
{
    public long Id { get; set; }
    public string Tipo { get; set; } = "";
    public string Payload { get; set; } = "";
    public DateTime CreadoEn { get; set; }
    public DateTime? EnviadoEn { get; set; }
    public int Intentos { get; set; }
}

public class OcupacionSala
{
    public int Id { get; set; }
    public string? FotoUrl { get; set; }
    public int Personas { get; set; }
    public DateTime CreadoEn { get; set; }
}
