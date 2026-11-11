using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public record TokenGenerado(string Token, DateTime ExpiraEnUtc);

public interface IGeneradorToken
{
    TokenGenerado Generar(Usuario usuario);
}
