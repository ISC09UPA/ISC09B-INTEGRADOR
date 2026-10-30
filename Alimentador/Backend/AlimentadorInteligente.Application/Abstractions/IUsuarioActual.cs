namespace AlimentadorInteligente.Application.Abstractions;

/// <summary>Usuario autenticado de la petición actual (JWT).</summary>
public interface IUsuarioActual
{
    int Id { get; }
}
