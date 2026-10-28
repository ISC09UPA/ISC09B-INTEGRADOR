using System.ComponentModel.DataAnnotations;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Application.Escaner;

/// <summary>
/// Resultado de analizar la foto que toma el administrador (pantalla 7).
/// Todavía no se registra nada: es una vista previa.
/// </summary>
/// <param name="Placa">Null si Computer Vision no encontró una placa.</param>
/// <param name="Confianza">0 a 1 (el "96 %" de la pantalla).</param>
/// <param name="FotoBlob">Nombre de la foto en Blob Storage; se manda de vuelta en <see cref="RegistrarPasoRequest"/>.</param>
/// <param name="EntradaAbierta">Hora de la entrada abierta, si la placa ya está dentro.</param>
/// <param name="SeAbriraPluma">Si al registrar se va a abrir la pluma (false si es entrada y está lleno).</param>
public sealed record AnalisisPlacaDto(
    string? Placa,
    double Confianza,
    TipoVehiculo Tipo,
    string FotoBlob,
    string FotoUrl,
    TipoPaso SeRegistraraComo,
    DateTime? EntradaAbierta,
    bool SeAbriraPluma,
    int LugaresLibres);

/// <param name="Placa">La placa detectada o la que corrigió el administrador con "Editar". Null = no legible.</param>
public sealed record RegistrarPasoRequest(
    string? Placa,
    TipoVehiculo Tipo,
    [Required] string FotoBlob);

/// <summary>Lo que pasó al registrar el paso. También es lo que se le responde a la Raspberry.</summary>
/// <param name="MinutosEstancia">Solo en salidas.</param>
public sealed record ResultadoPasoDto(
    AccionPluma Accion,
    TipoPaso Tipo,
    MotivoDecision Motivo,
    string? Placa,
    Guid? AccesoId,
    int? MinutosEstancia);
