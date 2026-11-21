namespace CasaDomotica.API.Services;

/// <summary>
/// Estado momentáneo de la casa (no va a la base de datos):
/// chapa abierta, orden de abrir que espera la Raspberry y "latido" de la Raspberry.
/// </summary>
public sealed class PuertaEstado
{
    private volatile bool _abierta;
    private long _ordenExpira;
    private long _ultimoLatido;

    public bool Abierta => _abierta;

    /// <summary>Muestra la puerta como abierta unos segundos (lo que dura el servo).</summary>
    public async Task AbrirAsync(int segundos = 5)
    {
        _abierta = true;
        await Task.Delay(TimeSpan.FromSeconds(segundos));
        _abierta = false;
    }

    /// <summary>La app pidió abrir: la Raspberry tiene 15 s para recogerla.</summary>
    public void PedirAbrir() => Interlocked.Exchange(ref _ordenExpira, DateTime.UtcNow.AddSeconds(15).Ticks);

    /// <summary>La Raspberry recoge la orden (solo una vez). Devuelve true si había una orden vigente.</summary>
    public bool ConsumirOrden()
    {
        var expira = Interlocked.Exchange(ref _ordenExpira, 0);
        return expira > DateTime.UtcNow.Ticks;
    }

    public void Latido() => Interlocked.Exchange(ref _ultimoLatido, DateTime.UtcNow.Ticks);

    public bool RaspberryEnLinea
    {
        get
        {
            var ultimo = Interlocked.Read(ref _ultimoLatido);
            return ultimo > 0 && DateTime.UtcNow.Ticks - ultimo < TimeSpan.FromSeconds(10).Ticks;
        }
    }
}
