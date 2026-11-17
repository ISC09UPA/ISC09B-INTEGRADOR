using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Domain.Constantes;

namespace AlmacenInteligente.Application.Services;

// Revisión de lecturas compartida por la ingesta (antes de encolar) y el procesador (antes de guardar).
public static class LecturaValidador
{
    public const int CantidadMaxima = 1_000;
    public const int PesoMaximoGramos = 1_000_000;
    private static readonly TimeSpan ToleranciaReloj = TimeSpan.FromMinutes(5);

    // Devuelve la lectura limpia (mayúsculas, valores por omisión, id y hora) o el error.
    public static (LecturaDispositivoDto? Lectura, string? Error) Normalizar(LecturaDispositivoDto? dto, DateTime ahoraUtc)
    {
        if (dto is null)
            return (null, "La lectura está vacía.");

        var dispositivo = dto.DispositivoId?.Trim() ?? string.Empty;
        var espacio = dto.EspacioId?.Trim().ToUpperInvariant() ?? string.Empty;
        var tipo = dto.TipoSensor?.Trim().ToUpperInvariant() ?? string.Empty;
        var lecturaId = string.IsNullOrWhiteSpace(dto.LecturaId) ? Guid.NewGuid().ToString("N") : dto.LecturaId.Trim();

        if (dispositivo.Length is 0 or > 50)
            return (null, "dispositivoId es obligatorio (máximo 50 caracteres).");
        if (espacio.Length is 0 or > 10)
            return (null, "espacioId es obligatorio (por ejemplo A1-E1).");
        if (lecturaId.Length > 64)
            return (null, "lecturaId admite máximo 64 caracteres.");

        var fecha = HoraUtc(dto.FechaHora, ahoraUtc);

        if (tipo == TiposSensor.Infrarrojo)
        {
            var evento = dto.Evento?.Trim().ToUpperInvariant() ?? string.Empty;
            var cantidad = dto.Cantidad ?? 1;

            if (evento is not (TiposMovimiento.Entrada or TiposMovimiento.Salida))
                return (null, "En una lectura IR, evento debe ser ENTRADA o SALIDA.");
            if (cantidad is < 1 or > CantidadMaxima)
                return (null, $"En una lectura IR, cantidad debe estar entre 1 y {CantidadMaxima}.");

            return (new LecturaDispositivoDto(lecturaId, dispositivo, espacio, tipo, evento, cantidad, null, fecha), null);
        }

        if (tipo == TiposSensor.Peso)
        {
            if (dto.PesoGramos is null)
                return (null, "En una lectura PESO, pesoGramos es obligatorio.");
            if (dto.PesoGramos > PesoMaximoGramos)
                return (null, $"pesoGramos no puede pasar de {PesoMaximoGramos}.");

            // Ruido de la celda de carga: un peso negativo se toma como 0.
            var peso = Math.Max(0m, Math.Round(dto.PesoGramos.Value));
            return (new LecturaDispositivoDto(lecturaId, dispositivo, espacio, tipo, null, null, peso, fecha), null);
        }

        return (null, "tipoSensor debe ser IR o PESO.");
    }

    // Sin hora, o con el reloj de la Raspberry adelantado, se usa la hora de llegada.
    private static DateTime HoraUtc(DateTime? fecha, DateTime ahoraUtc)
    {
        if (fecha is null)
            return ahoraUtc;

        var utc = fecha.Value.Kind == DateTimeKind.Local
            ? fecha.Value.ToUniversalTime()
            : DateTime.SpecifyKind(fecha.Value, DateTimeKind.Utc);

        return utc > ahoraUtc + ToleranciaReloj ? ahoraUtc : utc;
    }
}
