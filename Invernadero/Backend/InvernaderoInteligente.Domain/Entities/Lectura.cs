namespace InvernaderoInteligente.Domain.Entities;

public class Lectura
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SensorId { get; set; }
    public double Valor { get; set; }
    public DateTime FechaLectura { get; set; } = DateTime.UtcNow;

    public Sensor? Sensor { get; set; }
}