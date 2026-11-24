namespace InvernaderoInteligente.Application.DTOs
{
    public class LoginResponseDto
    {
        public string token { get; set; } = string.Empty;
        public string nombre { get; set; } = string.Empty;
        public string correo { get; set; } = string.Empty;
        public DateTime expiracion { get; set; }
    }
}
