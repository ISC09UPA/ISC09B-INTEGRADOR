namespace AlimentadorInteligente.Infrastructure.Options;

public class JwtOptions
{
    public const string Seccion = "Jwt";
    public string Issuer { get; set; } = "AlimentadorInteligente";
    public string Audience { get; set; } = "AlimentadorInteligente.App";
    /// <summary>Clave de firma; se configura con user-secrets o variables de entorno, nunca en Git.</summary>
    public string Key { get; set; } = string.Empty;
    public int AccessTokenMinutos { get; set; } = 15;
}

public class BlobStorageOptions
{
    public const string Seccion = "BlobStorage";
    public string ConnectionString { get; set; } = string.Empty;
}

public class ExpoPushOptions
{
    public const string Seccion = "ExpoPush";
    public string Url { get; set; } = "https://exp.host/--/api/v2/push/send";
    public string? AccessToken { get; set; }
}
