namespace AlmacenInteligente.Domain.Entities;

// Bitácora de entradas y salidas.
// Un movimiento MANUAL ajusta la existencia del espacio; la siguiente lectura del sensor la corrige.
public class Movimiento
{
    public long Id { get; set; }
    public string ProductoId { get; set; } = string.Empty;
    public string TipoMovimiento { get; set; } = string.Empty; // ENTRADA | SALIDA
    public int Cantidad { get; set; }
    public string Origen { get; set; } = string.Empty; // SENSOR | CAMARA | MANUAL
    public int? UsuarioId { get; set; } // null si lo generó el sensor o la cámara
    public DateTime FechaHora { get; set; }

    public Producto Producto { get; set; } = null!;
    public Usuario? Usuario { get; set; }
}
