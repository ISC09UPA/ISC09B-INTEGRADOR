namespace InvernaderoInteligente.Domain.Entities;

public class Sensor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public TipoSensor Tipo { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public List<Lectura> Lecturas { get; set; } = new();
}