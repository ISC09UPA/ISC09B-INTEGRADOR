namespace EstacionamientoInteligente.Domain.Comun;

/// <summary>
/// Se lanza cuando una operación rompe una regla del negocio
/// (por ejemplo, registrar la salida de un acceso que ya está cerrado).
/// La API la convierte en una respuesta 400.
/// </summary>
public class ExcepcionDominio(string mensaje) : Exception(mensaje);
