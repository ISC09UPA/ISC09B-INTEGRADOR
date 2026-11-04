namespace AlmacenInteligente.Domain.Entities;

public class Alerta
{
    public long Id { get; set; }
    public string ProductoId { get; set; } = string.Empty;
    public int Existencia { get; set; }
    public int PuntoReorden { get; set; }
    public string Estado { get; set; } = Constantes.EstadosAlerta.Activa;
    public DateTime CreadaEn { get; set; }
    public DateTime? AtendidaEn { get; set; }

    public Producto Producto { get; set; } = null!;
}
