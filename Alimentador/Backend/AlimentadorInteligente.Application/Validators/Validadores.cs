using AlimentadorInteligente.Application.DTOs;
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
    }
}

public class ActualizarAlimentadorValidator : AbstractValidator<ActualizarAlimentadorRequest>
{
    public ActualizarAlimentadorValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.KcalPorGramo).InclusiveBetween(1, 6);
        RuleFor(x => x.IntervaloMinimoHoras).InclusiveBetween(3, 24);
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
        RuleFor(x => x.EtiquetaRfid).MaximumLength(32);
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
        RuleFor(x => x.Gramos).GreaterThan(0).LessThanOrEqualTo(500);
    }
}
