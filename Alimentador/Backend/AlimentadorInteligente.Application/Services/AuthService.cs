using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AuthService(
    IAppDbContext db, ITokenService tokens, IPasswordHasher hasher, IUsuarioActual usuarioActual,
    AdminOpciones adminOpciones) : IAuthService
{
    private static readonly TimeSpan VigenciaRefresh = TimeSpan.FromDays(30);
    public const string MensajeCuentaDesactivada = "Tu cuenta está desactivada. Contacta a un administrador.";

    public async Task<AuthResponse> RegistrarAsync(RegistroRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Usuarios.AnyAsync(u => u.Email == email, ct))
            throw new ConflictoException("El correo ya está registrado.");

        var usuario = new Usuario
        {
            Nombre = request.Nombre.Trim(),
            Email = email,
            PasswordHash = hasher.Hash(request.Password)
        };
        RegistrarAcceso(usuario);
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync(ct);
        return await EmitirTokensAsync(usuario, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (usuario is null || !hasher.Verificar(request.Password, usuario.PasswordHash))
            throw new NoAutorizadoException();
        // Solo después de validar la contraseña, para no revelar qué cuentas existen
        if (!usuario.Activo)
            throw new ProhibidoException(MensajeCuentaDesactivada);

        RegistrarAcceso(usuario);
        return await EmitirTokensAsync(usuario, ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = tokens.Hash(request.RefreshToken);
        var actual = await db.RefreshTokens.Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.TokenHash == hash, ct);
        if (actual is null || !actual.EstaActivo)
            throw new NoAutorizadoException("Refresh token inválido o vencido.");
        if (!actual.Usuario.Activo)
            throw new NoAutorizadoException(MensajeCuentaDesactivada);

        // Rotación: el token usado se revoca y se emite uno nuevo
        actual.RevocadoEn = DateTimeOffset.UtcNow;
        RegistrarAcceso(actual.Usuario);
        return await EmitirTokensAsync(actual.Usuario, ct);
    }

    public async Task LogoutAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = tokens.Hash(request.RefreshToken);
        var actual = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash, ct);
        if (actual is { RevocadoEn: null })
        {
            actual.RevocadoEn = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task GuardarPushTokenAsync(PushTokenRequest request, CancellationToken ct = default)
    {
        var usuario = await db.Usuarios.FindAsync([usuarioActual.Id], ct)
            ?? throw new NoEncontradoException("Usuario", usuarioActual.Id);
        usuario.ExpoPushToken = request.ExpoPushToken;
        await db.SaveChangesAsync(ct);
    }

    public async Task<YoDto> ObtenerYoAsync(CancellationToken ct = default)
        => await db.Usuarios.AsNoTracking()
               .Where(u => u.Id == usuarioActual.Id)
               .Select(u => new YoDto(u.Id, u.Nombre, u.Email, u.EsAdministrador))
               .FirstOrDefaultAsync(ct)
           ?? throw new NoEncontradoException("Usuario", usuarioActual.Id);

    /// <summary>Marca el último acceso y da el rol a los correos de Admin:CorreosIniciales (nunca lo quita).</summary>
    private void RegistrarAcceso(Usuario usuario)
    {
        usuario.UltimoAcceso = DateTimeOffset.UtcNow;
        if (!usuario.EsAdministrador && adminOpciones.EsCorreoInicial(usuario.Email))
            usuario.EsAdministrador = true;
    }

    private async Task<AuthResponse> EmitirTokensAsync(Usuario usuario, CancellationToken ct)
    {
        var (access, expira) = tokens.GenerarAccessToken(usuario);
        var refresh = tokens.GenerarRefreshToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            UsuarioId = usuario.Id,
            TokenHash = tokens.Hash(refresh),
            ExpiraEn = DateTimeOffset.UtcNow.Add(VigenciaRefresh)
        });
        await db.SaveChangesAsync(ct);
        return new AuthResponse(usuario.Id, usuario.Nombre, access, expira, refresh, usuario.EsAdministrador);
    }
}
