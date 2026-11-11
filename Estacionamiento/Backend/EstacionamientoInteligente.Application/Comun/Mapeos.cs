using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Application.Comun;

/// <summary>Conversiones de entidades a DTOs que usan varios services.</summary>
public static class Mapeos
{
    public static AlertaDto AAlertaDto(Alerta a, IAlmacenFotos fotos) =>
        new(
            a.Id,
            a.Tipo,
            a.Mensaje,
            a.Placa,
            a.Foto is null ? null : fotos.ObtenerUrl(a.Foto),
            a.VehiculoId,
            a.Fecha,
            a.Atendida);
}
