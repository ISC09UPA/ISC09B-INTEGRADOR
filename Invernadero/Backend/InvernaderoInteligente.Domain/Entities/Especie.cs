namespace InvernaderoInteligente.Domain.Entities;

public class Especie
{
    public int id_Planta { get; set; }
    public string nombre { get; set; } = string.Empty;
    public ICollection<Maceta> Macetas { get; set; } = new List<Maceta>();
}
