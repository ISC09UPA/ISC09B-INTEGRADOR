namespace ProyectoInteligente.Application.DTOs;

public class PeopleCountDto
{
    public int Personas { get; set; }
    public string Hora { get; set; } = string.Empty;
    public string Resumen { get; set; } = string.Empty;
    public int TotalPeople { get; set; }
    public int StandingPeople { get; set; }
}
