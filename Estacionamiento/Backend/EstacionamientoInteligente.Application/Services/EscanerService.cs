using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Servicios;
using EstacionamientoInteligente.Domain.ValueObjects;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>
/// Escáner de placas desde el celular del administrador, pantalla 7 (CU-18).
/// Paso 1: analizar la foto (vista previa). Paso 2: registrar con la placa confirmada o corregida.
/// </summary>
public class EscanerService(
    IAlmacenFotos fotos,
    ILectorPlacas lector,
    IProcesadorPasoPluma procesador,
    IComandosMaqueta comandos,
    IVehiculoDao vehiculos,
    IAccesoDao accesos,
    ICajonDao cajones) : IEscanerService
{
    /// <summary>Límite de la foto que acepta la pantalla 7.</summary>
    public const long TamanoMaximoBytes = 4 * 1024 * 1024;

    private static readonly string[] TiposPermitidos = ["image/jpeg", "image/png"];

    public async Task<AnalisisPlacaDto> AnalizarAsync(Stream foto, string tipoContenido)
    {
        ValidarFoto(foto, tipoContenido);

        var nombre = await fotos.SubirAsync(foto, tipoContenido);
        var url = fotos.ObtenerUrl(nombre);
        var lectura = await lector.LeerAsync(url);

        // La misma decisión que tomaría la maqueta, sin guardar nada.
        var decision = await procesador.PrevisualizarAsync(lectura.Placa);

        // Si la placa ya está registrada, se muestra como está guardada ("ABC-123-A" y no "ABC123A")
        // y, si está dentro, desde qué hora.
        DateTime? entradaAbierta = null;
        if (Placa.TryCrear(lectura.Placa, out var placa) && await vehiculos.ObtenerPorPlacaAsync(placa) is { } vehiculo)
        {
            placa = vehiculo.Placa ?? placa;
            entradaAbierta = (await accesos.ObtenerAbiertoDeVehiculoAsync(vehiculo.Id))?.HoraEntrada;
        }

        var lugares = ReglasAcceso.LugaresDisponibles(
            await cajones.ContarLibresAsync(),
            (await accesos.ObtenerEnTransitoAsync()).Count);

        return new AnalisisPlacaDto(
            placa?.Valor,
            lectura.Confianza,
            lectura.Tipo,
            FotoBlob: nombre,
            FotoUrl: url,
            SeRegistraraComo: decision.Tipo,
            EntradaAbierta: entradaAbierta,
            SeAbriraPluma: decision.Accion == AccionPluma.Abrir,
            LugaresLibres: lugares);
    }

    public async Task<ResultadoPasoDto> RegistrarAsync(RegistrarPasoRequest request)
    {
        // Confianza 1: la placa ya la vio y confirmó (o corrigió) el administrador.
        var resultado = await procesador.ProcesarAsync(new PasoPluma(
            request.Placa,
            Confianza: 1,
            request.Tipo,
            request.FotoBlob,
            OrigenAcceso.Escaner));

        // La pluma solo se abre si las reglas lo permitieron (por ejemplo, no si está lleno).
        if (resultado.Accion == AccionPluma.Abrir)
        {
            var paso = resultado.Tipo == TipoPaso.Entrada ? "entrada" : "salida";
            await comandos.AbrirPlumaAsync($"Escáner: {paso} de {resultado.Placa ?? "placa no legible"}");
        }

        return resultado;
    }

    private static void ValidarFoto(Stream foto, string tipoContenido)
    {
        if (!TiposPermitidos.Contains(tipoContenido?.ToLowerInvariant()))
            throw new ExcepcionDominio("La foto debe ser JPG o PNG.");

        if (foto.CanSeek && foto.Length == 0)
            throw new ExcepcionDominio("La foto está vacía.");

        if (foto.CanSeek && foto.Length > TamanoMaximoBytes)
            throw new ExcepcionDominio("La foto no puede pesar más de 4 MB.");
    }
}
