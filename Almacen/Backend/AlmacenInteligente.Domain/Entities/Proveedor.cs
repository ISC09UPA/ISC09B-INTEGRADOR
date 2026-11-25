namespace AlmacenInteligente.Domain.Entities;

// Proveedor de un producto: recibe el correo del pedido de reabastecimiento.
// Lat/Lon sirven para la ruta con Azure Maps (tabla nueva: Database/003_proveedores_pedidos.sql).
public class Proveedor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public decimal? Lat { get; set; }
    public decimal? Lon { get; set; }

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
