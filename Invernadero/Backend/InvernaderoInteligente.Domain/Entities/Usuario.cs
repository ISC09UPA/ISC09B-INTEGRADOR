namespace InvernaderoInteligente.Domain.Entities
{
    public class Usuario
    {
        public Guid id_Usuario { get; set; } = Guid.NewGuid();
        public string nombre { get; set; } = string.Empty;
        public string correo { get; set; } = string.Empty;
        public string contrasena { get; set; } = string.Empty;
        public DateTime fecha_Registro { get; set; } = DateTime.UtcNow;
        public string rol { get; set; } = "Usuario";
    }
}
