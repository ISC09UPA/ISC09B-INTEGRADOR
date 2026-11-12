namespace AlimentadorInteligente.Application;

/// <summary>Configuración de OTA (sección "Ota"). Solo los correos listados pueden publicar artefactos.</summary>
public class OtaOpciones
{
    public const string Seccion = "Ota";

    /// <summary>Correos de los administradores; si la lista está vacía, nadie puede publicar.</summary>
    public string[] Administradores { get; set; } = [];

    public bool EsAdministrador(string email)
        => !string.IsNullOrWhiteSpace(email)
           && Administradores.Any(a => string.Equals(a?.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase));
}
