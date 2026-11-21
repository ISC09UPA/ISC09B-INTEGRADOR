namespace CasaDomotica.Application;

public record ResultadoRostro(bool Exito, string Nombre, double Probabilidad, int StatusAzure, string? Error, string? Detalle);

/// <summary>Reconocimiento facial con Azure Custom Vision.</summary>
public interface IReconocimientoFacial
{
    bool Configurado { get; }
    Task<ResultadoRostro> ClasificarAsync(byte[] foto, CancellationToken ct = default);
    /// <summary>Manda una imagen gris de prueba para comprobar llave, proyecto y nombre publicado.</summary>
    Task<ResultadoRostro> ProbarAsync(CancellationToken ct = default);
}

public record FotoDto(string Nombre, string Url, DateTime Hora, string Resultado, string Zona, string Etiqueta);

/// <summary>Fotos de accesos en Azure Blob Storage.</summary>
public interface IAlmacenFotos
{
    bool Configurado { get; }
    Task<string?> SubirAsync(byte[] foto, string resultado, string zona, string etiqueta, double probabilidad, CancellationToken ct = default);
    Task<IReadOnlyList<FotoDto>> ListarAsync(int max, CancellationToken ct = default);
    Task<(bool Ok, string Mensaje)> ProbarAsync(CancellationToken ct = default);
}

/// <summary>Estado: "enviado", "omitido" (por límite), "apagado" (sin configurar) o "error".</summary>
public record ResultadoCorreo(string Estado, string Mensaje)
{
    public bool Enviado => Estado == "enviado";
}

/// <summary>Correos de alerta con Azure Communication Services.</summary>
public interface IAlertasCorreo
{
    bool Configurado { get; }
    Task<ResultadoCorreo> EnviarAsync(
        string asunto,
        string titulo,
        IReadOnlyList<KeyValuePair<string, string>> datos,
        byte[]? foto = null,
        bool ignorarLimites = false,
        CancellationToken ct = default);
}

public record InfoMapa(int? Minutos, double DistanciaKm);

/// <summary>Azure Maps: mapa de la casa y tiempo de llegada.</summary>
public interface IMapas
{
    bool Configurado { get; }
    Task<InfoMapa?> CalcularAsync(double lat, double lon, CancellationToken ct = default);
    Task<byte[]?> ImagenAsync(double? lat, double? lon, CancellationToken ct = default);
}
