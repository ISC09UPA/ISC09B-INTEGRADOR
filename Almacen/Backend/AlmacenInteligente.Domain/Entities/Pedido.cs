namespace AlmacenInteligente.Domain.Entities;

// Pedido de reabastecimiento al proveedor (botón Reordenar de la app).
// Al crearlo se manda un correo al proveedor; al recibirlo se registra una ENTRADA con origen PEDIDO.
public class Pedido
{
    public long Id { get; set; }
    public string ProductoId { get; set; } = string.Empty;
    public int ProveedorId { get; set; }
    public int Cantidad { get; set; }
    public int? CantidadRecibida { get; set; }
    public string Estado { get; set; } = Constantes.EstadosPedido.Solicitado;
    public bool CorreoEnviado { get; set; }
    public long? AlertaId { get; set; } // alerta activa del producto al momento de pedir
    public int UsuarioId { get; set; }   // admin que lo solicitó
    public DateTime FechaSolicitud { get; set; }
    public DateTime? FechaRecepcion { get; set; }

    public Producto Producto { get; set; } = null!;
    public Proveedor Proveedor { get; set; } = null!;
    public Alerta? Alerta { get; set; }
    public Usuario Usuario { get; set; } = null!;
}
