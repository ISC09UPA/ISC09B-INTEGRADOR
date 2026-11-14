namespace EstacionamientoInteligente.Infrastructure.Data;

/// <summary>
/// Sección <c>"Administrador"</c> de appsettings: la cuenta que se crea al arrancar si no existe.
/// En Azure la contraseña va en App Settings como <c>Administrador__Contrasena</c>, nunca en git.
/// </summary>
public class OpcionesAdministrador
{
    public const string Seccion = "Administrador";

    public string Nombre { get; set; } = "Administrador";

    public string Correo { get; set; } = "";

    public string Contrasena { get; set; } = "";
}
