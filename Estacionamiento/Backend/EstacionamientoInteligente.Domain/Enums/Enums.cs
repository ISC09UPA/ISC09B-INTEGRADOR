namespace EstacionamientoInteligente.Domain.Enums;

public enum RolUsuario
{
    Usuario = 1,
    Administrador = 2
}

/// <summary>Clasificación que devuelve Custom Vision.</summary>
public enum TipoVehiculo
{
    Desconocido = 0,
    Carro = 1,
    Camioneta = 2,
    Moto = 3,
    Camion = 4
}

public enum EstadoVehiculo
{
    Alta = 1,
    Baja = 2
}

public enum EstadoCajon
{
    Libre = 1,
    Ocupado = 2
}

/// <summary>Qué significa que un vehículo pase por la pluma.</summary>
public enum TipoPaso
{
    Entrada = 1,
    Salida = 2
}

/// <summary>Respuesta que recibe la Raspberry Pi.</summary>
public enum AccionPluma
{
    Abrir = 1,
    Negar = 2
}

/// <summary>Por qué se tomó la decisión de abrir o negar.</summary>
public enum MotivoDecision
{
    EntradaPermitida = 1,
    SalidaRegistrada = 2,
    EstacionamientoLleno = 3,
    LecturaRepetida = 4
}

/// <summary>De dónde vino la foto que originó el acceso.</summary>
public enum OrigenAcceso
{
    Maqueta = 1,
    Escaner = 2
}

public enum TipoAlerta
{
    EntradaNegada = 1,
    PlacaNoLegible = 2,
    CajonSinSalida = 3
}

public enum TipoEventoSensor
{
    Cajon = 1,
    Pluma = 2
}
