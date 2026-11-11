using AlmacenInteligente.Application.Interfaces;

namespace AlmacenInteligente.Infrastructure.Seguridad;

public class ServicioContrasenaBcrypt : IServicioContrasena
{
    public string Hashear(string contrasena) =>
        BCrypt.Net.BCrypt.HashPassword(contrasena, workFactor: 11);

    public bool Verificar(string contrasena, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(contrasena, hash);
        }
        catch (Exception)
        {
            // Si el valor guardado en hashContrasena no es un hash BCrypt válido, se rechaza el acceso.
            return false;
        }
    }
}
