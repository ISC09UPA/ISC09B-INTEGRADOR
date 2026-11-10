using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace EstacionamientoInteligente.Infrastructure.Seguridad;

/// <summary>
/// Sección <c>"Jwt"</c> de appsettings. La <see cref="Clave"/> real de producción
/// va en la configuración de Azure (App Settings), nunca en git.
/// </summary>
public class OpcionesJwt
{
    public const string Seccion = "Jwt";

    /// <summary>Quién emite el token (la API).</summary>
    public string Emisor { get; set; } = "";

    /// <summary>Para quién es el token (la app).</summary>
    public string Audiencia { get; set; } = "";

    /// <summary>Llave secreta con la que se firma. Mínimo 32 caracteres.</summary>
    public string Clave { get; set; } = "";

    /// <summary>Cuánto dura la sesión antes de pedir login otra vez.</summary>
    public int MinutosExpiracion { get; set; } = 480;

    /// <summary>Llave lista para firmar y validar con HMAC-SHA256.</summary>
    public SymmetricSecurityKey ObtenerLlave()
    {
        if (string.IsNullOrWhiteSpace(Clave) || Encoding.UTF8.GetByteCount(Clave) < 32)
            throw new InvalidOperationException(
                "Falta configurar Jwt:Clave (mínimo 32 caracteres). " +
                "En desarrollo va en appsettings.Development.json; en Azure, en App Settings como Jwt__Clave.");

        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Clave));
    }
}
