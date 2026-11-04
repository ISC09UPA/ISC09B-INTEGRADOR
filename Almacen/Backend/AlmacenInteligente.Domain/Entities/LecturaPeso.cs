namespace AlmacenInteligente.Domain.Entities;

public class LecturaPeso
{
    public long Id { get; set; }
    public string EspacioId { get; set; } = string.Empty;
    public int PesoGramos { get; set; }
    public DateTime FechaHora { get; set; }

    public Espacio Espacio { get; set; } = null!;
}
