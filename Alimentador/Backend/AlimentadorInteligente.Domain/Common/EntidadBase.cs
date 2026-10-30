namespace AlimentadorInteligente.Domain.Common;

public abstract class EntidadBase
{
    public int Id { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
}
