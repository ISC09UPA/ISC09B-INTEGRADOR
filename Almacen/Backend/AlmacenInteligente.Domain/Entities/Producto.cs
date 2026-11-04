namespace AlmacenInteligente.Domain.Entities;

public class Producto
{
    public string Id { get; set; } = string.Empty; // PROD-001
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public int PesoUnitarioGramos { get; set; }
    public int PuntoReorden { get; set; }
    public string? EtiquetaVision { get; set; } // clase que devuelve el modelo de visión
    public string? ImagenUrl { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; }

    public ICollection<Espacio> Espacios { get; set; } = new List<Espacio>();
    public ICollection<Movimiento> Movimientos { get; set; } = new List<Movimiento>();
    public ICollection<ConteoVisual> ConteosVisuales { get; set; } = new List<ConteoVisual>();
    public ICollection<Alerta> Alertas { get; set; } = new List<Alerta>();
    public Estadistica? Estadistica { get; set; }
}
