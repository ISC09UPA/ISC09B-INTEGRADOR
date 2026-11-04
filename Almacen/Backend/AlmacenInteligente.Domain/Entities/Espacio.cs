namespace AlmacenInteligente.Domain.Entities;

public class Espacio
{
    public string Id { get; set; } = string.Empty; // A1-E1
    public string AnaquelId { get; set; } = string.Empty;
    public string? ProductoId { get; set; } // null = espacio vacío
    public int TaraGramos { get; set; }
    public int Existencia { get; set; } // fuente de verdad: sensor de peso
    public DateTime? UltimaLectura { get; set; }

    public Anaquel Anaquel { get; set; } = null!;
    public Producto? Producto { get; set; }
    public ICollection<LecturaPeso> LecturasPeso { get; set; } = new List<LecturaPeso>();
}
