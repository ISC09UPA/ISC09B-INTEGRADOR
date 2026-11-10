namespace EstacionamientoInteligente.Application.Comun;

/// <summary>
/// Las fechas se guardan en UTC, pero "hoy", "esta semana" y "este mes" se cuentan
/// en hora del centro de México. Sin esto, una visita del 31 de octubre a las 11 p.m.
/// contaría como de noviembre.
/// </summary>
public static class HoraLocal
{
    /// <summary>Hora del centro de México (UTC-6, sin horario de verano desde 2022).</summary>
    public static readonly TimeZoneInfo Zona = TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City");

    public static DateTime AUtc(DateTime local) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), Zona);

    public static DateTime ALocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zona);

    /// <summary>Inicio y fin (sin incluir) de un mes local, en UTC, para consultar la base.</summary>
    public static (DateTime Desde, DateTime Hasta) RangoMesUtc(int anio, int mes)
    {
        var inicio = new DateTime(anio, mes, 1);
        return (AUtc(inicio), AUtc(inicio.AddMonths(1)));
    }

    /// <summary>Inicio y fin (sin incluir) de un día local, en UTC.</summary>
    public static (DateTime Desde, DateTime Hasta) RangoDiaUtc(DateOnly dia)
    {
        var inicio = dia.ToDateTime(TimeOnly.MinValue);
        return (AUtc(inicio), AUtc(inicio.AddDays(1)));
    }
}
