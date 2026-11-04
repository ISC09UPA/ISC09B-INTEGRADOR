namespace AlmacenInteligente.Domain.Entities;

// Conteo de la cámara; sirve para verificar contra el peso.
public class ConteoVisual
{
    public long Id { get; set; }
    public string AnaquelId { get; set; } = string.Empty;
    public string ProductoId { get; set; } = string.Empty;
    public int Cantidad { get; set; }
    public double? Confianza { get; set; }
    public DateTime FechaHora { get; set; }

    public Anaquel Anaquel { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
}
