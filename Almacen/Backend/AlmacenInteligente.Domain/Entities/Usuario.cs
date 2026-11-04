namespace AlmacenInteligente.Domain.Entities;

public class Usuario
{
    public int Id { get; set; }
    public string NombreUsuario { get; set; } = string.Empty; // columna "usuario"
    public string HashContrasena { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;

    public ICollection<Movimiento> Movimientos { get; set; } = new List<Movimiento>();
}
