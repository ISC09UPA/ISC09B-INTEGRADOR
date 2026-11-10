using System.Security.Cryptography;
using System.Text.RegularExpressions;
using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public partial class OtaService(
    IAppDbContext db, IUsuarioActual usuario, IAlmacenamientoArchivos archivos, OtaOpciones opciones) : IOtaService
{
    private const int MaxVersion = 30;

    public async Task<ArtefactoOtaDto> PublicarAsync(PublicarArtefactoRequest request, Stream contenido, CancellationToken ct = default)
    {
        await RequerirAdministradorAsync(ct);

        var tipo = ParsearTipo(request.Tipo)
            ?? throw new ReglaNegocioException("El tipo debe ser 'firmware' o 'modelo'.");
        var version = request.Version?.Trim() ?? string.Empty;
        if (version.Length is 0 or > MaxVersion || !VersionValida().IsMatch(version))
            throw new ReglaNegocioException(
                $"La versión es obligatoria (máximo {MaxVersion} caracteres), debe empezar con letra o número y solo puede tener letras, números, punto, guion y guion bajo.");

        if (await db.ArtefactosOta.AnyAsync(a => a.Tipo == tipo && a.Version == version, ct))
            throw new ConflictoException($"Ya existe un {NombreTipo(tipo)} con la versión {version}.");

        // El hash se calcula antes de subir; si el flujo no se puede rebobinar se copia a memoria
        Stream datos = contenido;
        MemoryStream? copia = null;
        try
        {
            if (!contenido.CanSeek)
            {
                copia = new MemoryStream();
                await contenido.CopyToAsync(copia, ct);
                datos = copia;
            }
            datos.Position = 0;

            long tamano = datos.Length;
            if (tamano == 0)
                throw new ReglaNegocioException("El archivo está vacío.");
            if (tamano > Constantes.MaxTamanoArtefactoOta)
                throw new ReglaNegocioException(
                    $"El archivo supera el máximo de {Constantes.MaxTamanoArtefactoOta / (1024 * 1024)} MB.");

            var sha256 = Convert.ToHexStringLower(await SHA256.HashDataAsync(datos, ct));
            datos.Position = 0;

            var blobNombre = $"{NombreTipo(tipo)}/{version}/{NombreArchivoSeguro(request.NombreArchivo)}";
            await archivos.SubirAsync(Constantes.ContenedorOta, blobNombre, datos, ct);

            var artefacto = new ArtefactoOta
            {
                Tipo = tipo,
                Version = version,
                BlobNombre = blobNombre,
                Sha256 = sha256,
                TamanoBytes = tamano
            };
            db.ArtefactosOta.Add(artefacto);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Otra publicación con la misma versión ganó la carrera; no se deja el blob huérfano
                db.ArtefactosOta.Remove(artefacto);
                await archivos.EliminarAsync(Constantes.ContenedorOta, blobNombre, CancellationToken.None);
                throw new ConflictoException($"Ya existe un {NombreTipo(tipo)} con la versión {version}.");
            }

            return new ArtefactoOtaDto(artefacto.Id, artefacto.Tipo, artefacto.Version, artefacto.Sha256,
                artefacto.TamanoBytes, artefacto.CreadoEn);
        }
        finally
        {
            copia?.Dispose();
        }
    }

    public async Task EliminarAsync(int id, CancellationToken ct = default)
    {
        await RequerirAdministradorAsync(ct);
        var artefacto = await db.ArtefactosOta.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NoEncontradoException("Artefacto OTA", id);

        // Los comandos guardan la referencia como historial de qué se instaló
        if (await db.Comandos.AnyAsync(c => c.ArtefactoOtaId == id, ct))
            throw new ConflictoException("El artefacto ya se usó en una actualización y no se puede borrar.");

        db.ArtefactosOta.Remove(artefacto);
        await db.SaveChangesAsync(ct);
        await archivos.EliminarAsync(Constantes.ContenedorOta, artefacto.BlobNombre, ct);
    }

    private async Task RequerirAdministradorAsync(CancellationToken ct)
    {
        var email = await db.Usuarios.AsNoTracking()
            .Where(u => u.Id == usuario.Id)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(ct);
        if (email is null || !opciones.EsAdministrador(email))
            throw new ProhibidoException("Solo los administradores pueden publicar o borrar artefactos OTA.");
    }

    /// <summary>Acepta "model" porque es el nombre que usa el protocolo con el ESP32.</summary>
    public static TipoArtefactoOta? ParsearTipo(string? tipo) => tipo?.Trim().ToLowerInvariant() switch
    {
        "firmware" => TipoArtefactoOta.Firmware,
        "modelo" or "model" => TipoArtefactoOta.Modelo,
        _ => null
    };

    private static string NombreTipo(TipoArtefactoOta tipo) => tipo == TipoArtefactoOta.Firmware ? "firmware" : "modelo";

    /// <summary>Solo el nombre, sin rutas, con caracteres seguros para la URL del blob.</summary>
    private static string NombreArchivoSeguro(string? nombre)
    {
        var limpio = CaracteresNoSeguros().Replace(Path.GetFileName(nombre ?? string.Empty), "_").Trim('.', '_');
        if (limpio.Length > 100) limpio = limpio[^100..];
        return limpio.Length == 0 ? "artefacto.bin" : limpio;
    }

    [GeneratedRegex("^[0-9A-Za-z][0-9A-Za-z._-]*$")]
    private static partial Regex VersionValida();

    [GeneratedRegex("[^0-9A-Za-z._-]")]
    private static partial Regex CaracteresNoSeguros();
}
