using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Common.Interfaces;

public interface ITokenService
{
    string Create(Usuario user);   // user.Rol must be loaded
}
