namespace EstacionamientoInteligente.Domain.Comun;

/// <summary>
/// Se lanza cuando no se pudo comprobar quién es el usuario
/// (correo o contraseña incorrectos, o el rol elegido no es el de su cuenta).
/// La API la convierte en una respuesta 401.
/// </summary>
public class ExcepcionNoAutenticado(string mensaje) : Exception(mensaje);
