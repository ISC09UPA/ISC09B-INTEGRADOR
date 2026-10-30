using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Escáner de placas desde el celular del administrador, pantalla 7 (CU-18).</summary>
public interface IEscanerService
{
    /// <summary>
    /// Sube la foto, lee placa y tipo y dice si se registraría como entrada o salida.
    /// Es solo una vista previa: no guarda ningún acceso.
    /// </summary>
    /// <param name="foto">Contenido de la imagen (el controller lo saca del archivo recibido).</param>
    /// <param name="tipoContenido">Por ejemplo "image/jpeg".</param>
    Task<AnalisisPlacaDto> AnalizarAsync(Stream foto, string tipoContenido);

    /// <summary>Registra el paso con la placa confirmada usando las mismas reglas que la maqueta.</summary>
    Task<ResultadoPasoDto> RegistrarAsync(RegistrarPasoRequest request);
}
