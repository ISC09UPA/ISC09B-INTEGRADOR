namespace EstacionamientoInteligente.Domain.Comun;

/// <summary>
/// Se lanza cuando el usuario sí inició sesión pero no puede ver o hacer eso
/// (por ejemplo, el detalle de un cajón donde está el auto de otra persona).
/// La API la convierte en una respuesta 403.
/// </summary>
public class ExcepcionAccesoDenegado(string mensaje) : Exception(mensaje);
