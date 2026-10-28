namespace EstacionamientoInteligente.Domain.Comun;

/// <summary>
/// Base de todas las entidades. El Id se genera en el dominio para que la entidad
/// sea válida desde que se crea, sin esperar a la base de datos.
/// </summary>
public abstract class EntidadBase
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
}
