using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Domain.Models;

/// <summary>
/// Un lugar de la maqueta. Su estado lo decide únicamente el sensor IR del cajón.
/// </summary>
public class Cajon : EntidadBase
{
    public int Numero { get; private set; }
    public EstadoCajon Estado { get; private set; }
    public DateTime UltimoCambio { get; private set; }

    private Cajon() { } // EF Core

    public static Cajon Crear(int numero, DateTime fecha)
    {
        if (numero < 1)
            throw new ExcepcionDominio("El número de cajón debe ser mayor a cero.");

        return new Cajon { Numero = numero, Estado = EstadoCajon.Libre, UltimoCambio = fecha };
    }

    public bool EstaLibre => Estado == EstadoCajon.Libre;

    /// <summary>
    /// Aplica la lectura del sensor. Devuelve false si el estado no cambió,
    /// para no notificar ni guardar eventos repetidos.
    /// </summary>
    public bool ActualizarEstado(bool ocupado, DateTime fecha)
    {
        var nuevo = ocupado ? EstadoCajon.Ocupado : EstadoCajon.Libre;
        if (nuevo == Estado)
            return false;

        Estado = nuevo;
        UltimoCambio = fecha;
        return true;
    }
}
