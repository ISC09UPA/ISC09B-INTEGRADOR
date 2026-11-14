namespace InvernaderoInteligente.Application.DTOs
{
    public class UsuarioDto
    {
        public int id_Usuario { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string correo { get; set; } = string.Empty;
        public DateTime fecha_Registro { get; set; }
    }
}
