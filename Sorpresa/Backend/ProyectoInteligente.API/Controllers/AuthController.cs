using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(IAppDbContext db, ITokenService tokens) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest req, CancellationToken ct)
    {
        var user = await db.Usuarios.Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Correo == req.Correo && u.Activo, ct);

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials" });

        return new LoginResponse(tokens.Create(user), user.Nombre, user.Rol.Nombre);
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req, CancellationToken ct)
    {
        var correo = req.Correo.Trim().ToLowerInvariant();
        if (await db.Usuarios.AnyAsync(u => u.Correo == correo, ct))
            return Conflict(new { message = "El correo ya está registrado" });

        var rol = await db.Roles.FirstOrDefaultAsync(r => r.Nombre == "paciente", ct);
        if (rol == null) return StatusCode(500, new { message = "Rol paciente no existe" });

        db.Usuarios.Add(new Usuario
        {
            Nombre = req.Nombre.Trim(),
            Correo = correo,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            RolId = rol.Id
        });
        await db.SaveChangesAsync(ct);
        return StatusCode(201, new { message = "Usuario registrado" });
    }

    // lets the app validate a stored token and read the role; also a quick check that roles work
    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new
    {
        id = User.FindFirst("sub")?.Value,
        nombre = User.Identity?.Name,
        rol = User.FindFirst("role")?.Value,
        esDoctor = User.IsInRole("doctor")
    });
}
