using AlmacenInteligente.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace AlmacenInteligente.API.Controllers;

// Base de los controladores: convierte un Resultado con error al formato acordado { "error": "mensaje legible" }.
public abstract class ApiControllerBase : ControllerBase
{
    protected ObjectResult ErrorHttp<T>(Resultado<T> resultado)
    {
        var cuerpo = new { error = resultado.Error };
        return resultado.TipoError switch
        {
            TipoError.Validacion => BadRequest(cuerpo),
            TipoError.NoEncontrado => NotFound(cuerpo),
            TipoError.Conflicto => Conflict(cuerpo),
            TipoError.NoAutorizado => Unauthorized(cuerpo),
            _ => StatusCode(StatusCodes.Status500InternalServerError, cuerpo)
        };
    }
}
