namespace AlmacenInteligente.Domain.Entities;

// Bitácora de todo lo que manda la Raspberry (tabla creada por Database/002_lecturas_dispositivo.sql).
// LecturaId evita procesar dos veces la misma lectura cuando la Raspberry resincroniza lo que guardó sin conexión.
public class LecturaDispositivo
{
    public string LecturaId { get; set; } = string.Empty;
    public string DispositivoId { get; set; } = string.Empty;
    public string EspacioId { get; set; } = string.Empty;
    public string TipoSensor { get; set; } = string.Empty; // IR | PESO
    public string? Evento { get; set; }                     // ENTRADA | SALIDA (solo IR)
    public int? Cantidad { get; set; }                      // solo IR
    public int? PesoGramos { get; set; }                    // solo PESO
    public DateTime FechaHora { get; set; }                 // cuándo la tomó el sensor
    public DateTime ProcesadaEn { get; set; }               // cuándo la procesó la nube
    public string Resultado { get; set; } = string.Empty;   // qué se hizo con ella
}
