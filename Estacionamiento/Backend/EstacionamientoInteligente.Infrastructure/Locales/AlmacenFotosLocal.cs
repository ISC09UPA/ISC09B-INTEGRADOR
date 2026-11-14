using EstacionamientoInteligente.Application.Interfaces.Externos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace EstacionamientoInteligente.Infrastructure.Locales;

/// <summary>
/// Guarda las fotos en una carpeta de la compu mientras no exista Azure Blob Storage.
/// La API las sirve en <c>/fotos-locales/...</c> (ver Program.cs).
/// </summary>
/// <remarks>Se reemplaza por la versión con Blob ("fotos-placas") en la Fase 4.</remarks>
public class AlmacenFotosLocal(IWebHostEnvironment entorno, IHttpContextAccessor http) : IAlmacenFotos
{
    /// <summary>Carpeta dentro del proyecto API. Está en .gitignore.</summary>
    public const string Carpeta = "fotos-locales";

    /// <summary>Ruta en la URL donde la API sirve la carpeta.</summary>
    public const string RutaPublica = "/fotos-locales";

    public string RutaCarpeta => Path.Combine(entorno.ContentRootPath, Carpeta);

    public async Task<string> SubirAsync(Stream contenido, string tipoContenido)
    {
        var extension = tipoContenido switch
        {
            "image/png" => ".png",
            _ => ".jpg"
        };
        var nombre = $"{Guid.NewGuid():N}{extension}";

        Directory.CreateDirectory(RutaCarpeta);
        await using var archivo = File.Create(Path.Combine(RutaCarpeta, nombre));
        await contenido.CopyToAsync(archivo);

        return nombre;
    }

    /// <summary>
    /// URL completa con el mismo servidor que usó la app (por ejemplo <c>http://10.0.2.2:5141</c>
    /// en el emulador), para que la pueda abrir. Fuera de una petición regresa solo la ruta.
    /// </summary>
    public string ObtenerUrl(string nombre)
    {
        var ruta = $"{RutaPublica}/{Uri.EscapeDataString(nombre)}";
        var peticion = http.HttpContext?.Request;
        return peticion is null ? ruta : $"{peticion.Scheme}://{peticion.Host}{ruta}";
    }
}
