namespace AlimentadorInteligente.Application;

/// <summary>Configuración de administración (sección "Admin").</summary>
public class AdminOpciones
{
    public const string Seccion = "Admin";

    /// <summary>
    /// Correos que se vuelven administradores al registrarse, iniciar sesión o renovar tokens.
    /// Sirve para crear el primer administrador; estar fuera de la lista nunca quita el rol.
    /// </summary>
    public string[] CorreosIniciales { get; set; } = [];

    public bool EsCorreoInicial(string email)
        => !string.IsNullOrWhiteSpace(email)
           && CorreosIniciales.Any(c => string.Equals(c?.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase));
}
