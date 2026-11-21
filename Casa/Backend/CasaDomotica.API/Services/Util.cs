namespace CasaDomotica.API.Services;

public static class Util
{
    /// <summary>Etiquetas de Custom Vision que nunca cuentan como persona reconocida.</summary>
    private static readonly HashSet<string> EtiquetasNoPermitidas = new(StringComparer.OrdinalIgnoreCase)
    {
        "desconocido", "unknown", "negative"
    };

    public static bool EsPersona(string etiqueta) => !string.IsNullOrWhiteSpace(etiqueta) && !EtiquetasNoPermitidas.Contains(etiqueta);

    /// <summary>Acepta "data:image/jpeg;base64,XXXX" o solo "XXXX" y devuelve los bytes (null si no es válido).</summary>
    public static byte[]? DecodificarImagen(string? imagen)
    {
        if (string.IsNullOrWhiteSpace(imagen))
        {
            return null;
        }

        var coma = imagen.LastIndexOf(',');
        var base64 = coma >= 0 ? imagen[(coma + 1)..] : imagen;
        try
        {
            return Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
