using AlimentadorInteligente.Application.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.API.Middleware;

/// <summary>Manejo global de errores: traduce excepciones a ProblemDetails (RFC 7807).</summary>
public class ManejadorErrores(IProblemDetailsService problemDetails, ILogger<ManejadorErrores> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, titulo) = exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Datos inválidos"),
            ReglaNegocioException => (StatusCodes.Status400BadRequest, "Operación no permitida"),
            NoAutorizadoException or UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "No autorizado"),
            ProhibidoException => (StatusCodes.Status403Forbidden, "Acceso denegado"),
            NoEncontradoException => (StatusCodes.Status404NotFound, "No encontrado"),
            ConflictoException or DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Conflicto"),
            _ => (StatusCodes.Status500InternalServerError, "Error interno")
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Error no controlado en {Ruta}", context.Request.Path);

        var detalle = new ProblemDetails
        {
            Status = status,
            Title = titulo,
            Detail = exception switch
            {
                ValidationException => "Revisa los campos marcados.",
                _ when status == StatusCodes.Status500InternalServerError => "Ocurrió un error inesperado.",
                _ => exception.Message
            }
        };
        if (exception is ValidationException validacion)
        {
            detalle.Extensions["errors"] = validacion.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
        }

        context.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = detalle,
            Exception = exception
        });
    }
}
