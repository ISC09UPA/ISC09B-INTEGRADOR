namespace AlmacenInteligente.Application.Common;

public enum TipoError
{
    Ninguno,
    Validacion,
    NoEncontrado,
    Conflicto
}

// Resultado de una operación: el valor si salió bien, o el tipo de error y su mensaje.
public class Resultado<T>
{
    public T? Valor { get; }
    public string? Error { get; }
    public TipoError TipoError { get; }
    public bool EsExito => TipoError == TipoError.Ninguno;

    private Resultado(T? valor, string? error, TipoError tipoError)
    {
        Valor = valor;
        Error = error;
        TipoError = tipoError;
    }

    public static Resultado<T> Exito(T valor) => new(valor, null, TipoError.Ninguno);
    public static Resultado<T> Falla(TipoError tipo, string error) => new(default, error, tipo);
}
