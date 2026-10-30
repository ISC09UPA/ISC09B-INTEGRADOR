namespace EstacionamientoInteligente.Domain.Comun;

/// <summary>
/// Se lanza cuando lo que se pide no existe (un vehículo, un cajón, una alerta...).
/// La API la convierte en una respuesta 404.
/// </summary>
public class ExcepcionNoEncontrado(string mensaje) : Exception(mensaje);
