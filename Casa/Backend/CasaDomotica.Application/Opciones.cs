namespace CasaDomotica.Application;

public class CustomVisionOptions
{
    public string Endpoint { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public string PublishedName { get; set; } = "";
    public string Key { get; set; } = "";
    public double Umbral { get; set; } = 0.80;
}

public class BlobOptions
{
    public string AccountName { get; set; } = "";
    public string AccountKey { get; set; } = "";
    /// <summary>Opcional: cadena de conexión completa (si se pone, se usa en vez de AccountName + AccountKey).</summary>
    public string ConnectionString { get; set; } = "";
    public string Container { get; set; } = "fotos-accesos";
}

public class EmailOptions
{
    public string ConnectionString { get; set; } = "";
    public string Remitente { get; set; } = "";
    public string[] Destinatarios { get; set; } = Array.Empty<string>();
    /// <summary>Segundos mínimos entre un correo y otro.</summary>
    public int EsperaSegundos { get; set; } = 120;
    /// <summary>El dominio gratis de Azure solo permite 10 correos por hora.</summary>
    public int MaxPorHora { get; set; } = 8;
}

public class MapsOptions
{
    public string Key { get; set; } = "";
    public double CasaLat { get; set; }
    public double CasaLon { get; set; }
}
