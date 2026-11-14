namespace InvernaderoInteligente.Application.DTOs;

public class SensorDto
{
    public int id_Sensor { get; set; }
    public int id_T_Sensor { get; set; }
    public int id_Maceta { get; set; }
    public string codigo_hardware { get; set; } = string.Empty;
    public DateTime estado { get; set; }
}
