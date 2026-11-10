namespace AlimentadorInteligente.Domain.Services;

/// <summary>Convierte instantes UTC a días y horas de la zona de cada alimentador.</summary>
public static class CalendarioLocal
{
    public static bool EsZonaValida(string zona)
    {
        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(zona);
            return true;
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return false;
        }
    }

    public static DateOnly DiaDe(DateTimeOffset instante, string zona)
        => DateOnly.FromDateTime(ALocal(instante, zona).DateTime);

    /// <summary>Inicio del día local, en UTC (Npgsql solo acepta offset 0).</summary>
    public static DateTimeOffset InicioDe(DateOnly dia, string zona)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById(zona);
        var local = dia.ToDateTime(TimeOnly.MinValue);
        // En algunas zonas el cambio de horario se salta la medianoche
        if (tz.IsInvalidTime(local)) local = local.AddHours(1);
        return new DateTimeOffset(local, tz.GetUtcOffset(local)).ToUniversalTime();
    }

    public static string Hora(DateTimeOffset instante, string zona)
        => ALocal(instante, zona).ToString("HH:mm");

    private static DateTimeOffset ALocal(DateTimeOffset instante, string zona)
        => TimeZoneInfo.ConvertTime(instante, TimeZoneInfo.FindSystemTimeZoneById(zona));
}
