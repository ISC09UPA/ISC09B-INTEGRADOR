namespace ProyectoInteligente.Domain.Entities;

public class PeopleCount
{
    public int TotalPeople { get; set; }
    public int StandingPeople { get; set; }
    public string ContextoCrudo { get; set; } = string.Empty;
    public ResumenDeteccion? ResumenIa { get; set; }
}
