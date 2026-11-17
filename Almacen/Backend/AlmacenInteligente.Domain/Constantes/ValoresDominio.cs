namespace AlmacenInteligente.Domain.Constantes;

// Valores permitidos por los CHECK de la base de datos.
public static class Roles
{
    public const string Admin = "admin";
    public const string Operador = "operador";
}

public static class TiposMovimiento
{
    public const string Entrada = "ENTRADA";
    public const string Salida = "SALIDA";
}

public static class OrigenesMovimiento
{
    public const string Sensor = "SENSOR";
    public const string Camara = "CAMARA";
    public const string Manual = "MANUAL";
}

public static class EstadosAlerta
{
    public const string Activa = "ACTIVA";
    public const string Atendida = "ATENDIDA";
}

// Sensores que mandan lecturas desde la Raspberry (tabla LecturasDispositivo).
public static class TiposSensor
{
    public const string Infrarrojo = "IR";   // evento ENTRADA/SALIDA con cantidad
    public const string Peso = "PESO";       // peso total del espacio en gramos
}
