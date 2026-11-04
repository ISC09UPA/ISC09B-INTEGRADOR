namespace AlmacenInteligente.Domain.Entities;

public class Anaquel
{
    public string Id { get; set; } = string.Empty; // A1
    public string? Descripcion { get; set; }

    public ICollection<Espacio> Espacios { get; set; } = new List<Espacio>();
    public ICollection<ConteoVisual> ConteosVisuales { get; set; } = new List<ConteoVisual>();
}
