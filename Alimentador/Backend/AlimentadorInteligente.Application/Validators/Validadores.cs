using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Services;
using FluentValidation;

namespace AlimentadorInteligente.Application.Validators;

public class RegistroValidator : AbstractValidator<RegistroRequest>
{
    public RegistroValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
    }
}

public class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class RefreshValidator : AbstractValidator<RefreshRequest>
{
    public RefreshValidator() => RuleFor(x => x.RefreshToken).NotEmpty();
}

public class CrearAlimentadorValidator : AbstractValidator<CrearAlimentadorRequest>
{
    public CrearAlimentadorValidator()
    {
        RuleFor(x => x.Codigo).NotEmpty().MaximumLength(50).Matches("^[a-zA-Z0-9_-]+$")
            .WithMessage("El código solo puede tener letras, números, guion y guion bajo (se usa en los temas MQTT).");
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.KcalPorGramo).InclusiveBetween(1, 6);
        RuleFor(x => x.ZonaHoraria!).Must(CalendarioLocal.EsZonaValida).When(x => x.ZonaHoraria is not null)
            .WithMessage("La zona horaria no es válida; usa un identificador como America/Mexico_City.");
    }
}

public class ActualizarAlimentadorValidator : AbstractValidator<ActualizarAlimentadorRequest>
{
    public ActualizarAlimentadorValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.KcalPorGramo).InclusiveBetween(1, 6);
        RuleFor(x => x.IntervaloMinimoHoras).InclusiveBetween(3, 24);
        RuleFor(x => x.ZonaHoraria!).Must(CalendarioLocal.EsZonaValida).When(x => x.ZonaHoraria is not null)
            .WithMessage("La zona horaria no es válida; usa un identificador como America/Mexico_City.");
    }
}

public class AgregarMiembroValidator : AbstractValidator<AgregarMiembroRequest>
{
    public AgregarMiembroValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Rol).IsInEnum();
    }
}

public class GuardarMascotaValidator : AbstractValidator<GuardarMascotaRequest>
{
    public GuardarMascotaValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Especie).IsInEnum();
        RuleFor(x => x.PesoKg).GreaterThan(0).LessThanOrEqualTo(100);
        RuleFor(x => x.EdadMeses).InclusiveBetween(0, 300);
        RuleFor(x => x.NivelActividad).IsInEnum();
        RuleFor(x => x.ComidasPorDia).InclusiveBetween(1, 6);
        RuleFor(x => x.EtiquetaRfid).Matches("^[0-9A-Fa-f]{10,12}$").When(x => !string.IsNullOrWhiteSpace(x.EtiquetaRfid))
            .WithMessage("La etiqueta RFID debe ser hexadecimal, de 10 a 12 caracteres.");
    }
}

public class GuardarHorarioValidator : AbstractValidator<GuardarHorarioRequest>
{
    public GuardarHorarioValidator() => RuleFor(x => x.MascotaId).GreaterThan(0).When(x => x.MascotaId is not null);
}

public class DispensarValidator : AbstractValidator<DispensarRequest>
{
    public DispensarValidator()
    {
        RuleFor(x => x.Gramos).InclusiveBetween(1, 200);
        RuleFor(x => x.Tolva).InclusiveBetween(Mascota.TolvaPerro, Mascota.TolvaGato).When(x => x.Tolva is not null);
        RuleFor(x => x).Must(x => x.MascotaId is not null || x.Tolva is not null)
            .WithMessage("Indica la mascota o la tolva de la que se va a dispensar.");
    }
}

public class CrearGatewayValidator : AbstractValidator<CrearGatewayRequest>
{
    public CrearGatewayValidator()
        => RuleFor(x => x.DeviceId).NotEmpty().MaximumLength(50).Matches("^[a-zA-Z0-9_-]+$");
}

public class LigarGatewayValidator : AbstractValidator<LigarGatewayRequest>
{
    public LigarGatewayValidator() => RuleFor(x => x.GatewayId).GreaterThan(0);
}

public class LoteVisitasValidator : AbstractValidator<List<VisitaDispositivoDto>>
{
    public LoteVisitasValidator() => RuleFor(x => x.Count).LessThanOrEqualTo(Constantes.MaxLote);
}

public class LoteEventosValidator : AbstractValidator<List<EventoDispositivoDto>>
{
    public LoteEventosValidator() => RuleFor(x => x.Count).LessThanOrEqualTo(Constantes.MaxLote);
}

// --- Panel de administración ---

internal static class ReglasConsulta
{
    /// <summary>pagina ≥ 1 y tamano entre 1 y 100.</summary>
    public static void ValidarPaginacion<T>(this AbstractValidator<T> validador) where T : ConsultaPaginada
    {
        validador.RuleFor(x => x.Pagina).GreaterThanOrEqualTo(1);
        validador.RuleFor(x => x.Tamano).InclusiveBetween(1, Constantes.MaxTamanoPagina);
    }

    public static bool EsUnoDe(string? valor, params string[] permitidos)
        => valor is null || permitidos.Contains(valor.Trim(), StringComparer.OrdinalIgnoreCase);
}

public class ConsultaUsuariosValidator : AbstractValidator<ConsultaUsuarios>
{
    public ConsultaUsuariosValidator()
    {
        this.ValidarPaginacion();
        RuleFor(x => x.Buscar).MaximumLength(200);
    }
}

public class ConsultaAlimentadoresValidator : AbstractValidator<ConsultaAlimentadores>
{
    public ConsultaAlimentadoresValidator()
    {
        this.ValidarPaginacion();
        RuleFor(x => x.Buscar).MaximumLength(200);
        RuleFor(x => x.Estado).Must(e => ReglasConsulta.EsUnoDe(e, "todos", "enLinea", "sinConexion", "sinGateway"))
            .WithMessage("El estado debe ser todos, enLinea, sinConexion o sinGateway.");
    }
}

public class ConsultaEventosValidator : AbstractValidator<ConsultaEventos>
{
    public ConsultaEventosValidator()
    {
        this.ValidarPaginacion();
        RuleFor(x => x.Tipo).IsInEnum().When(x => x.Tipo is not null);
    }
}

public class ConsultaFotosValidator : AbstractValidator<ConsultaFotos>
{
    public ConsultaFotosValidator()
    {
        this.ValidarPaginacion();
        RuleFor(x => x.Estado).Must(e => ReglasConsulta.EsUnoDe(e, "pendientes", "revisadas", "todas"))
            .WithMessage("El estado debe ser pendientes, revisadas o todas.");
    }
}

public class ConsultaDesplieguesValidator : AbstractValidator<ConsultaDespliegues>
{
    public ConsultaDesplieguesValidator()
    {
        this.ValidarPaginacion();
        RuleFor(x => x.Estado).IsInEnum().When(x => x.Estado is not null);
    }
}

public class RevisarFotoValidator : AbstractValidator<RevisarFotoRequest>
{
    public RevisarFotoValidator() => RuleFor(x => x.Clase).IsInEnum();
}

public class CrearDespliegueOtaValidator : AbstractValidator<CrearDespliegueOtaRequest>
{
    public CrearDespliegueOtaValidator()
    {
        RuleFor(x => x.ArtefactoId).GreaterThan(0);
        RuleFor(x => x.AlimentadorIds).Cascade(CascadeMode.Stop).NotNull()
            .Must(ids => ids.Count is >= 1 and <= Constantes.MaxAlimentadoresDespliegue)
            .WithMessage($"Indica de 1 a {Constantes.MaxAlimentadoresDespliegue} alimentadores.")
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("La lista de alimentadores tiene ids repetidos.");
    }
}
