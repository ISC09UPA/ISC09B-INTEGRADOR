namespace EstacionamientoInteligente.Application.Interfaces.Externos;

/// <summary>Cifra contraseñas para no guardarlas en texto plano.</summary>
public interface IHasherContrasenas
{
    string Hashear(string contrasena);

    bool Verificar(string contrasena, string hash);
}
