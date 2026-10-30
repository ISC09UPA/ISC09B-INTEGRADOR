using FluentValidation;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AlimentadorInteligente.API.Filters;

/// <summary>Valida con FluentValidation cada argumento de acción que tenga un IValidator registrado.</summary>
public class ValidacionFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argumento in context.ActionArguments.Values)
        {
            if (argumento is null) continue;
            var tipoValidador = typeof(IValidator<>).MakeGenericType(argumento.GetType());
            if (services.GetService(tipoValidador) is not IValidator validador) continue;

            var resultado = await validador.ValidateAsync(new ValidationContext<object>(argumento), context.HttpContext.RequestAborted);
            if (!resultado.IsValid)
                throw new ValidationException(resultado.Errors);
        }
        await next();
    }
}
