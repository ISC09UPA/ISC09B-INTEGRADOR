namespace InvernaderoInteligente.Domain.Entities;

public class Actuador
{
    public int id_Actuador { get; set; }
    public string nombre { get; set; } = string.Empty;
    public string tipo { get; set; } = string.Empty;
    public string estado_Actual { get; set; } = string.Empty;
    public ICollection<HisRiesgo> HisRiesgos { get; set; } = new List<HisRiesgo>();
}
