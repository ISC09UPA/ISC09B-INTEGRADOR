using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Cómo se reparte una entrada o una salida entre los espacios de un producto.
// La usan los movimientos manuales (MovimientoService) y la recepción de pedidos (PedidoService).
// Modifica la existencia de los espacios en memoria; quien la llama hace el SaveChanges.
public static class RepartoEspacios
{
    public const int CantidadMaxima = 10_000;

    // Llena los espacios en orden sin pasar su capacidad (null = sin límite). Devuelve el error o null.
    public static string? Entrada(List<Espacio> espacios, int cantidad)
    {
        long libre = 0;
        foreach (var e in espacios)
            libre += e.Capacidad is int cap ? Math.Max(0, cap - e.Existencia) : CantidadMaxima;

        if (libre < cantidad)
            return $"No cabe: solo hay lugar para {libre} pieza(s) más.";

        var pendiente = cantidad;
        foreach (var e in espacios)
        {
            if (pendiente == 0) break;
            var lugar = e.Capacidad is int cap ? Math.Max(0, cap - e.Existencia) : pendiente;
            var poner = Math.Min(lugar, pendiente);
            e.Existencia += poner;
            pendiente -= poner;
        }
        return null;
    }

    // Saca de los espacios en orden. Devuelve el error o null.
    public static string? Salida(List<Espacio> espacios, int cantidad)
    {
        var total = espacios.Sum(e => e.Existencia);
        if (total < cantidad)
            return $"No hay suficiente existencia: solo hay {total} pieza(s).";

        var pendiente = cantidad;
        foreach (var e in espacios)
        {
            if (pendiente == 0) break;
            var quitar = Math.Min(e.Existencia, pendiente);
            e.Existencia -= quitar;
            pendiente -= quitar;
        }
        return null;
    }
}
