using System.Security.Cryptography;
using AlimentadorInteligente.Application.Abstractions;

namespace AlimentadorInteligente.Infrastructure.Security;

/// <summary>PBKDF2-SHA256 con sal aleatoria. Formato: iteraciones.sal.hash (Base64).</summary>
public class PasswordHasher : IPasswordHasher
{
    private const int Iteraciones = 100_000;
    private const int TamanoSal = 16;
    private const int TamanoHash = 32;

    public string Hash(string password)
    {
        var sal = RandomNumberGenerator.GetBytes(TamanoSal);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, sal, Iteraciones, HashAlgorithmName.SHA256, TamanoHash);
        return $"{Iteraciones}.{Convert.ToBase64String(sal)}.{Convert.ToBase64String(hash)}";
    }

    public bool Verificar(string password, string hashGuardado)
    {
        var partes = hashGuardado.Split('.');
        if (partes.Length != 3 || !int.TryParse(partes[0], out var iteraciones)) return false;

        var sal = Convert.FromBase64String(partes[1]);
        var esperado = Convert.FromBase64String(partes[2]);
        var calculado = Rfc2898DeriveBytes.Pbkdf2(password, sal, iteraciones, HashAlgorithmName.SHA256, esperado.Length);
        return CryptographicOperations.FixedTimeEquals(calculado, esperado);
    }
}
