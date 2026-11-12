namespace AlimentadorInteligente.Application.Exceptions;

/// <summary>Excepciones de aplicación que el middleware global traduce a códigos HTTP.</summary>
public abstract class AppException(string mensaje) : Exception(mensaje);

public class NoEncontradoException(string recurso, object id)
    : AppException($"{recurso} con id '{id}' no existe.");

public class ProhibidoException(string mensaje = "No tienes permiso para esta acción.")
    : AppException(mensaje);

public class NoAutorizadoException(string mensaje = "Credenciales inválidas.")
    : AppException(mensaje);

public class ConflictoException(string mensaje) : AppException(mensaje);

public class ReglaNegocioException(string mensaje) : AppException(mensaje);
