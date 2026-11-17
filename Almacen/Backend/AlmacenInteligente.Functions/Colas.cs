namespace AlmacenInteligente.Functions;

// Recursos de Service Bus creados el 27 oct 2026 (namespace sb-almacen-srg, plan Básico).
// Los atributos de las Functions necesitan constantes, por eso los nombres viven aquí.
internal static class Colas
{
    // Nombre de la configuración con la cadena de conexión (local.settings.json o variables de la Function App).
    public const string Conexion = "ServiceBusConnection";

    // Lecturas de la Raspberry: las deja la ingesta y las consume el procesador.
    public const string Lecturas = "movimientos";

    // Alertas de reorden: las deja el procesador y las consume NotificarAlerta.
    public const string Alertas = "alertas-reorden";
}
