namespace InvernaderoInteligente.Domain.Entities;

public class Cultivo
{
    public int id_Cultivo { get; set; }
    public string nombre { get; set; } = string.Empty;
    public double humedad_Min { get; set; }
    public double humedad_Max { get; set; }
    public ICollection<Maceta> Macetas { get; set; } = new List<Maceta>();
}
