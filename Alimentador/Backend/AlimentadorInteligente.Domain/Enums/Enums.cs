namespace AlimentadorInteligente.Domain.Enums;

public enum Especie { Perro, Gato }

public enum NivelActividad { Bajo, Moderado, Alto }

/// <summary>Clases que reconoce el modelo de visión (RF-03).</summary>
public enum ClaseDetectada { Perro, Gato, Paloma, Nada }

/// <summary>Rol de un usuario dentro de un alimentador (RF-19).</summary>
public enum RolAlimentador { Dueno, Cuidador }

/// <summary>Eventos que publica el ESP32 en feeder/{id}/event.</summary>
public enum TipoEvento { Jam, HopperLow, Pigeon }

public enum TipoAlerta
{
    NoHaComido,
    BajaApetito,
    Atasco,
    TolvaBaja,
    AlimentadorSinConexion,
    GatewaySinConexion,
    ConexionRestablecida,
    PalomasFrecuentes
}

public enum TipoComando { Dispensar, Ota }

public enum EstadoComando { Pendiente, Entregado, Completado, Fallido, Vencido }

public enum TipoArtefactoOta { Firmware, Modelo }
