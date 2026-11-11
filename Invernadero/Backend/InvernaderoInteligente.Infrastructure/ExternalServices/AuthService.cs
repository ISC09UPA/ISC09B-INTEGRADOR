using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InvernaderoInteligente.Application.DTOs;
using InvernaderoInteligente.Application.Interfaces;
using InvernaderoInteligente.Domain.Entities;
using InvernaderoInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace InvernaderoInteligente.Infrastructure.ExternalServices
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthService(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.correo == request.correo);

            if (usuario == null || !BCrypt.Net.BCrypt.Verify(request.contrasena, usuario.contrasena))
            {
                return null;
            }

            return GenerarRespuesta(usuario);
        }

        public async Task<LoginResponseDto?> RegisterAsync(RegisterRequestDto request)
        {
            var existe = await _context.Usuarios
                .AnyAsync(u => u.correo == request.correo);

            if (existe)
            {
                return null;
            }

            var usuario = new Usuario
            {
                nombre = string.IsNullOrWhiteSpace(request.nombre) ? request.correo.Split('@')[0] : request.nombre.Trim(),
                correo = request.correo.Trim(),
                contrasena = BCrypt.Net.BCrypt.HashPassword(request.contrasena),
                fecha_Registro = DateTime.UtcNow,
                rol = "Usuario"
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return GenerarRespuesta(usuario);
        }

        public async Task<UsuarioDto?> GetByIdAsync(Guid id_Usuario)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.id_Usuario == id_Usuario);

            if (usuario == null)
            {
                return null;
            }

            return new UsuarioDto
            {
                id_Usuario = usuario.id_Usuario,
                nombre = usuario.nombre,
                correo = usuario.correo,
                fecha_Registro = usuario.fecha_Registro,
                rol = usuario.rol
            };
        }

        private LoginResponseDto GenerarRespuesta(Usuario usuario)
        {
            return new LoginResponseDto
            {
                token = GenerarToken(usuario),
                nombre = usuario.nombre,
                correo = usuario.correo,
                expiracion = DateTime.UtcNow.AddHours(8)
            };
        }

        private string GenerarToken(Usuario usuario)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:SecretKey"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.id_Usuario.ToString()),
                new Claim(ClaimTypes.Email, usuario.correo),
                new Claim(ClaimTypes.Role, usuario.rol)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
