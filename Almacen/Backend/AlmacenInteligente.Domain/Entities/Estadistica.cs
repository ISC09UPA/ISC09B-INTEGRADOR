namespace AlmacenInteligente.Domain.Entities;

public class Estadistica
{
    public string ProductoId { get; set; } = string.Empty; // PK y FK a Productos
    public double? Rotacion { get; set; }
    public double? ConsumoDiarioPromedio { get; set; }
    public DateTime? FechaAgotamiento { get; set; }
    public DateTime CalculadoEn { get; set; }

    public Producto Producto { get; set; } = null!;
}
