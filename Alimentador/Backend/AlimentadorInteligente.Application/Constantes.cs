namespace AlimentadorInteligente.Application;

public static class Constantes
{
    /// <summary>La Pi manda heartbeat cada 5 min; se tolera perder uno.</summary>
    public static readonly TimeSpan ToleranciaHeartbeat = TimeSpan.FromMinutes(10);
    /// <summary>Silencio tras el cual se alerta que el ESP32 o la Pi están sin conexión.</summary>
    public static readonly TimeSpan LimiteSinConexion = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan LimiteSinComer = TimeSpan.FromHours(12);
    /// <summary>Si la Pi no avisa que terminó de vaciar su cola, la sincronización se da por cerrada.</summary>
    public static readonly TimeSpan LimiteSincronizacion = TimeSpan.FromMinutes(30);
    public const double UmbralBajaApetito = 0.70;
    /// <summary>La Pi manda lotes de 100; esto solo evita cuerpos desproporcionados.</summary>
    public const int MaxLote = 500;

    public const string ContenedorFotos = "fotos-dudosas";
    public const string ContenedorOta = "ota";
}
