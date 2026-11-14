public interface IBusServices
{
    Task EnviarComandoAsync(ComandoDto comando, CancellationToken ct = default);
}
