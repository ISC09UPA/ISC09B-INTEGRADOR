using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Application.Interfaces.Externos;

public sealed record TokenGenerado(string Token, DateTime Expira);

/// <summary>Crea el JWT del login con el id y el rol del usuario.</summary>
public interface IGeneradorToken
{
    TokenGenerado Generar(Usuario usuario);
}
