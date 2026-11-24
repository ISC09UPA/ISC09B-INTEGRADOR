namespace InvernaderoInteligente.Domain.Entities;

public class Usuario
{
    public int id_Usuario { get; set; }
    public string correo { get; set; } = string.Empty;
    public string contrasena { get; set; } = string.Empty;
    public string nombre { get; set; } = string.Empty;
    public DateTime fecha_Registro { get; set; }
}
