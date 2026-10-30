namespace EstacionamientoInteligente.Domain.Comun;

/// <summary>
/// Se lanza cuando la operación choca con el estado actual de los datos
/// (por ejemplo, una placa que ya está registrada o un vehículo que ya estaba dado de baja).
/// La API la convierte en una respuesta 409.
/// </summary>
public class ExcepcionConflicto(string mensaje) : Exception(mensaje);
