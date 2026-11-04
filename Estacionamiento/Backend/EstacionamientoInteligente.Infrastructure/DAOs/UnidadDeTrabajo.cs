using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace EstacionamientoInteligente.Infrastructure.DAOs;

/// <summary>
/// Guarda en una sola transacción todo lo que los DAOs agregaron o cambiaron durante la petición.
/// </summary>
public class UnidadDeTrabajo(EstacionamientoDbContext db) : IUnidadDeTrabajo
{
    // Errores de SQL Server por llave única repetida (índice único y restricción UNIQUE).
    private const int ErrorIndiceUnico = 2601;
    private const int ErrorRestriccionUnica = 2627;

    public async Task GuardarCambiosAsync()
    {
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: ErrorIndiceUnico or ErrorRestriccionUnica })
        {
            // Dos peticiones al mismo tiempo pueden pasar la validación del servicio
            // (misma placa o mismo correo); la base lo detecta y se responde 409.
            throw new ExcepcionConflicto("Ya existe un registro con esos datos (por ejemplo, la misma placa o el mismo correo).");
        }
    }
}
