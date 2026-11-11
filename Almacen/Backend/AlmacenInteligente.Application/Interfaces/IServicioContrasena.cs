namespace AlmacenInteligente.Application.Interfaces;

// Guarda y compara contraseñas sin que el resto del código conozca el algoritmo (BCrypt).
public interface IServicioContrasena
{
    string Hashear(string contrasena);
    bool Verificar(string contrasena, string hash);
}
