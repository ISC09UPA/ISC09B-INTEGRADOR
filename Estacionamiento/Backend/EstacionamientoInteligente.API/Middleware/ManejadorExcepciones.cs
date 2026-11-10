using EstacionamientoInteligente.Domain.Comun;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Middleware;

/// <summary>
/// Convierte las excepciones del dominio en respuestas HTTP con formato ProblemDetails:
/// <list type="bullet">
///   <item><see cref="ExcepcionDominio"/> → 400</item>
///   <item><see cref="ExcepcionNoAutenticado"/> → 401</item>
///   <item><see cref="ExcepcionAccesoDenegado"/> → 403</item>
///   <item><see cref="ExcepcionNoEncontrado"/> → 404</item>
///   <item><see cref="ExcepcionConflicto"/> → 409</item>
/// </list>
/// Cualquier otra excepción la deja pasar y sale como 500 sin mostrar detalles internos.
/// </summary>
public class ManejadorExcepciones(
    IProblemDetailsService problemDetails,
    ILogger<ManejadorExcepciones> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        (int estado, string titulo)? respuesta = exception switch
        {
            ExcepcionDominio        => (StatusCodes.Status400BadRequest, "Solicitud no válida"),
            ExcepcionNoAutenticado  => (StatusCodes.Status401Unauthorized, "No autenticado"),
            ExcepcionAccesoDenegado => (StatusCodes.Status403Forbidden, "Acceso denegado"),
            ExcepcionNoEncontrado   => (StatusCodes.Status404NotFound, "No encontrado"),
            ExcepcionConflicto      => (StatusCodes.Status409Conflict, "Conflicto"),
            _ => null
        };

        if (respuesta is null)
        {
            logger.LogError(exception, "Error no controlado en {Ruta}", httpContext.Request.Path);
            return false; // La maneja el comportamiento por defecto → 500.
        }

        logger.LogInformation("{Tipo}: {Mensaje}", exception.GetType().Name, exception.Message);

        httpContext.Response.StatusCode = respuesta.Value.estado;

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = respuesta.Value.estado,
                Title = respuesta.Value.titulo,
                Detail = exception.Message
            }
        });
    }
}
