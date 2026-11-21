using CasaDomotica.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CasaDomotica.API.Filters;

/// <summary>
/// Protege los endpoints de la Raspberry con la cabecera X-Api-Key (Raspberry:ApiKey) y
/// registra cada llamada como "latido" para saber si la casa está en línea.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class ClaveRaspberryAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var servicios = context.HttpContext.RequestServices;
        var esperada = servicios.GetRequiredService<IConfiguration>()["Raspberry:ApiKey"];
        var recibida = context.HttpContext.Request.Headers["X-Api-Key"].ToString();

        if (!string.IsNullOrEmpty(esperada) && recibida != esperada)
        {
            context.Result = new UnauthorizedObjectResult(new { mensaje = "Clave de la Raspberry inválida (X-Api-Key)." });
            return;
        }

        servicios.GetRequiredService<PuertaEstado>().Latido();
        await next();
    }
}
