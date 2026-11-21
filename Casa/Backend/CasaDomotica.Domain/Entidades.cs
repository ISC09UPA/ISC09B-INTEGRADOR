namespace CasaDomotica.Domain;

/// <summary>Persona reconocida (debe llamarse igual que la etiqueta de Azure Custom Vision).</summary>
public class Persona
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
}

public class AccesoLog
{
    public int Id { get; set; }
    public string Mensaje { get; set; } = "";
    public DateTime Hora { get; set; }
}

public class AlertaLog
{
    public int Id { get; set; }
    public string Mensaje { get; set; } = "";
    public DateTime Hora { get; set; }
}

public class Luz
{
    public string Nombre { get; set; } = "";
    public bool Encendida { get; set; }
}

public class ClimaRegistro
{
    public string Zona { get; set; } = "";
    public double Temp { get; set; }
    public double Hum { get; set; }
}

/// <summary>Una sola fila (Id = 1) con los ajustes generales de la casa.</summary>
public class Ajuste
{
    public int Id { get; set; } = 1;
    public bool SeguridadActiva { get; set; } = true;
    public int Lux { get; set; }
}
