using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Regla única del punto de reorden. La usan las lecturas de la Raspberry (LecturaService) y los movimientos
// manuales de la app (MovimientoService), para que las dos rutas creen y atiendan las alertas igual:
//  - Existencia total en el punto de reorden o abajo, sin alerta activa → alerta nueva ACTIVA.
//  - Existencia por encima del punto, con una alerta activa → esa alerta pasa a ATENDIDA.
// No guarda nada: quien la llama agrega la alerta nueva y hace el SaveChanges.
public static class ReglaReorden
{
    public static CambioReorden Evaluar(Producto producto, int existenciaTotal, Alerta? activa, DateTime ahora)
    {
        if (existenciaTotal <= producto.PuntoReorden)
        {
            if (activa is not null)
                return CambioReorden.SinCambio; // ya hay una alerta activa: solo una a la vez

            var nueva = new Alerta
            {
                ProductoId = producto.Id,
                Existencia = existenciaTotal,
                PuntoReorden = producto.PuntoReorden,
                Estado = EstadosAlerta.Activa,
                CreadaEn = ahora
            };
            return new CambioReorden(nueva, null);
        }

        if (activa is null)
            return CambioReorden.SinCambio;

        activa.Estado = EstadosAlerta.Atendida;
        activa.AtendidaEn = ahora;
        return new CambioReorden(null, activa);
    }
}

// Qué cambió al revisar el punto de reorden: la alerta que se creó o la que se atendió (o ninguna).
public record CambioReorden(Alerta? Nueva, Alerta? Atendida)
{
    public static readonly CambioReorden SinCambio = new(null, null);
}
