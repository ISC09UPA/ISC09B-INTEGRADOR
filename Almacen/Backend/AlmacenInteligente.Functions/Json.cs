using System.Text.Json;

namespace AlmacenInteligente.Functions;

// Mismo formato JSON en la entrada HTTP y en los mensajes de las colas: camelCase y sin distinguir mayúsculas.
internal static class Json
{
    public static readonly JsonSerializerOptions Opciones = new(JsonSerializerDefaults.Web);
}
