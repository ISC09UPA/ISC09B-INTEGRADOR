namespace EstacionamientoInteligente.Domain.DAOs;

/// <summary>
/// Guarda en la base, de una sola vez, todo lo que se agregó o cambió durante una petición.
/// Así un paso por la pluma (acceso + alerta + evento) se guarda completo o no se guarda nada.
/// </summary>
/// <remarks>
/// Los DAOs no tienen métodos "Actualizar": basta con cambiar la entidad que devolvieron
/// (por ejemplo <c>vehiculo.DarDeBaja(...)</c>) y luego llamar a <see cref="GuardarCambiosAsync"/>.
/// </remarks>
public interface IUnidadDeTrabajo
{
    Task GuardarCambiosAsync();
}
