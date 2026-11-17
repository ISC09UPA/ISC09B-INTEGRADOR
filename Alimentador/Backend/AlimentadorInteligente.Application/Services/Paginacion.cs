using AlimentadorInteligente.Application.DTOs;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

internal static class Paginacion
{
    /// <summary>Cuenta el total con el filtro aplicado y trae solo la página pedida.</summary>
    public static Task<Pagina<T>> PaginarAsync<T>(this IQueryable<T> consulta, ConsultaPaginada pagina, CancellationToken ct)
        => consulta.PaginarAsync(pagina, x => x, ct);

    /// <summary>Igual, pero con un mapeo en memoria de las filas de la página (URL SAS, estado calculado).</summary>
    public static async Task<Pagina<T>> PaginarAsync<TFila, T>(
        this IQueryable<TFila> consulta, ConsultaPaginada pagina, Func<TFila, T> mapear, CancellationToken ct)
    {
        int total = await consulta.CountAsync(ct);
        // long evita el desbordamiento con números de página enormes
        int saltar = (int)Math.Min((long)(pagina.Pagina - 1) * pagina.Tamano, int.MaxValue);
        var filas = await consulta.Skip(saltar).Take(pagina.Tamano).ToListAsync(ct);
        return new Pagina<T>(filas.Select(mapear).ToList(), total, pagina.Pagina, pagina.Tamano);
    }
}
