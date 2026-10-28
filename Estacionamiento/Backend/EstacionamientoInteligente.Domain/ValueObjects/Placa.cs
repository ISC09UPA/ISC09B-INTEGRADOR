using System.Diagnostics.CodeAnalysis;
using System.Text;
using EstacionamientoInteligente.Domain.Comun;

namespace EstacionamientoInteligente.Domain.ValueObjects;

/// <summary>
/// Placa de un vehículo.
/// <para>
/// <see cref="Valor"/> es el texto que se muestra ("ABC-123-A").
/// <see cref="Clave"/> es solo letras y números ("ABC123A") y es lo que se compara,
/// para que "ABC 123 A", "abc-123-a" y "ABC123A" sean la misma placa.
/// </para>
/// </summary>
public sealed record Placa
{
    public const int LongitudMinima = 5;
    public const int LongitudMaxima = 8;

    public string Valor { get; }
    public string Clave { get; }

    private Placa(string valor, string clave)
    {
        Valor = valor;
        Clave = clave;
    }

    /// <summary>Crea la placa o lanza <see cref="ExcepcionDominio"/> si no es válida.</summary>
    public static Placa Crear(string? texto)
    {
        if (!TryCrear(texto, out var placa))
            throw new ExcepcionDominio($"'{texto}' no es una placa válida.");
        return placa;
    }

    /// <summary>Intenta crear la placa; útil para lecturas de OCR que pueden venir mal.</summary>
    public static bool TryCrear(string? texto, [NotNullWhen(true)] out Placa? placa)
    {
        placa = null;
        if (string.IsNullOrWhiteSpace(texto))
            return false;

        var valor = NormalizarTexto(texto);
        var clave = ObtenerClave(valor);

        if (clave.Length is < LongitudMinima or > LongitudMaxima)
            return false;
        // Una placa siempre combina letras y números.
        if (!clave.Any(char.IsLetter) || !clave.Any(char.IsDigit))
            return false;

        placa = new Placa(valor, clave);
        return true;
    }

    /// <summary>
    /// Busca una placa entre las líneas de texto que leyó Computer Vision.
    /// La foto puede traer otros textos (estado, leyendas), así que se queda
    /// con la primera línea que tenga forma de placa.
    /// </summary>
    public static Placa? BuscarEnTexto(IEnumerable<string> lineas)
    {
        foreach (var linea in lineas)
        {
            if (TryCrear(linea, out var placa))
                return placa;
        }
        return null;
    }

    /// <summary>Clave de comparación de un texto cualquiera, para búsquedas parciales.</summary>
    public static string ObtenerClave(string texto) =>
        new(texto.ToUpperInvariant().Where(char.IsAsciiLetterOrDigit).ToArray());

    /// <summary>Mayúsculas, solo letras/números/guiones y un solo guion entre bloques.</summary>
    private static string NormalizarTexto(string texto)
    {
        var sb = new StringBuilder();
        foreach (var c in texto.Trim().ToUpperInvariant())
        {
            if (char.IsAsciiLetterOrDigit(c))
                sb.Append(c);
            else if ((c is '-' or ' ' or '.') && sb.Length > 0 && sb[^1] != '-')
                sb.Append('-');
        }
        return sb.ToString().TrimEnd('-');
    }

    public bool Equals(Placa? otra) => otra is not null && Clave == otra.Clave;
    public override int GetHashCode() => Clave.GetHashCode();
    public override string ToString() => Valor;
}
