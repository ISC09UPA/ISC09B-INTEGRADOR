public interface IProcesarLecturasService
{
    Task ProcesarAsync(LoteLecturas lote, CancellationToken ct);
}