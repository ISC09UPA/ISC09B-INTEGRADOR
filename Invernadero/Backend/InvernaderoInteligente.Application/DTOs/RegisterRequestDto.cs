namespace InvernaderoInteligente.Application.DTOs
{
    public class RegisterRequestDto
    {
        public string nombre { get; set; } = string.Empty;
        public string correo { get; set; } = string.Empty;
        public string contrasena { get; set; } = string.Empty;
    }
}
