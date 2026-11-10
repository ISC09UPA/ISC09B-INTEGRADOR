using EstacionamientoInteligente.Application.Interfaces.Externos;

namespace EstacionamientoInteligente.Infrastructure.Seguridad;

/// <summary>
/// Hashea y verifica contraseñas con BCrypt.
/// Cada hash lleva su propia sal aleatoria, así que dos usuarios con la misma
/// contraseña quedan con hashes distintos. El hash se guarda en <c>contrasena_hash</c>.
/// </summary>
public class HasherContrasenas : IHasherContrasenas
{
    /// <summary>
    /// Costo de BCrypt (2^11 vueltas). Más alto = más seguro pero más lento;
    /// 11 tarda alrededor de 100–200 ms por contraseña, suficiente para un login.
    /// </summary>
    private const int Costo = 11;

    public string Hashear(string contrasena)
    {
        ArgumentException.ThrowIfNullOrEmpty(contrasena);
        return BCrypt.Net.BCrypt.HashPassword(contrasena, Costo);
    }

    public bool Verificar(string contrasena, string hash)
    {
        if (string.IsNullOrEmpty(contrasena) || string.IsNullOrEmpty(hash))
            return false;

        try
        {
            return BCrypt.Net.BCrypt.Verify(contrasena, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // El hash guardado no tiene formato BCrypt (dato dañado o de prueba): no entra.
            return false;
        }
    }
}
