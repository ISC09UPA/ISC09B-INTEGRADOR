namespace AlmacenInteligente.API.Seguridad;

// Sección "Jwt" de la configuración. La llave (Key) va SOLO en User Secrets / App Service, nunca en el repo.
public class JwtOpciones
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "AlmacenInteligente";
    public string Audience { get; set; } = "AlmacenInteligente.Clientes";
    public int MinutosExpiracion { get; set; } = 480;
}

// Nombres de los claims dentro del token (cortos y fijos; no dependen del mapeo automático de .NET).
public static class TiposClaim
{
    public const string Id = "sub";
    public const string Usuario = "name";
    public const string Rol = "role";
    public const string Nombre = "nombre";
}
