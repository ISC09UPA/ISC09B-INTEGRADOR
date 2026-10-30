namespace EstacionamientoInteligente.Application.Interfaces.Externos;

/// <summary>Dónde se guardan las fotos de las placas. Lo implementa Infrastructure con Azure Blob Storage.</summary>
public interface IAlmacenFotos
{
    /// <summary>Guarda la foto y regresa su nombre, que es lo que se guarda en la base.</summary>
    /// <param name="tipoContenido">Por ejemplo "image/jpeg".</param>
    Task<string> SubirAsync(Stream contenido, string tipoContenido);

    /// <summary>URL temporal para que la app o Vision puedan ver la foto.</summary>
    string ObtenerUrl(string nombre);
}
