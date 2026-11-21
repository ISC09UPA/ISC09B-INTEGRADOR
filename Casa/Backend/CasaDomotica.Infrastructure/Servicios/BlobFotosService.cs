using System.Globalization;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using CasaDomotica.Application;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CasaDomotica.Infrastructure.Servicios;

/// <summary>
/// Fotos de accesos en Azure Blob Storage. Usa el mismo contenedor y el mismo formato de nombre que la Raspberry:
/// yyyy-MM-dd/HH-mm-ss_resultado_zona_etiqueta.jpg
/// </summary>
public sealed class BlobFotosService : IAlmacenFotos
{
    private readonly BlobOptions _o;
    private readonly ILogger<BlobFotosService> _log;
    private BlobContainerClient? _contenedor;

    public BlobFotosService(IOptions<BlobOptions> o, ILogger<BlobFotosService> log)
    {
        _o = o.Value;
        _log = log;
    }

    public bool Configurado => CadenaConexion() is not null;

    private string? CadenaConexion()
    {
        if (!string.IsNullOrWhiteSpace(_o.ConnectionString)
            && _o.ConnectionString.Contains("AccountName=", StringComparison.OrdinalIgnoreCase))
        {
            return _o.ConnectionString;
        }

        if (!string.IsNullOrWhiteSpace(_o.AccountName)
            && !string.IsNullOrWhiteSpace(_o.AccountKey)
            && !_o.AccountKey.StartsWith("PEGA", StringComparison.OrdinalIgnoreCase))
        {
            return $"DefaultEndpointsProtocol=https;AccountName={_o.AccountName};AccountKey={_o.AccountKey};EndpointSuffix=core.windows.net";
        }

        return null;
    }

    private async Task<BlobContainerClient> ContenedorAsync(CancellationToken ct)
    {
        if (_contenedor is not null)
        {
            return _contenedor;
        }

        var cadena = CadenaConexion() ?? throw new InvalidOperationException("Blob Storage no está configurado.");
        var contenedor = new BlobContainerClient(cadena, _o.Container);
        await contenedor.CreateIfNotExistsAsync(cancellationToken: ct);
        _contenedor = contenedor;
        return contenedor;
    }

    public async Task<string?> SubirAsync(byte[] foto, string resultado, string zona, string etiqueta, double probabilidad, CancellationToken ct = default)
    {
        if (!Configurado)
        {
            return null;
        }

        try
        {
            var ahora = DateTime.Now;
            var limpia = (string.IsNullOrWhiteSpace(etiqueta) ? "desconocido" : etiqueta).Replace(' ', '_');
            var ruta = $"{ahora.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}/"
                       + $"{ahora.ToString("HH-mm-ss", CultureInfo.InvariantCulture)}_{resultado}_{zona}_{limpia}.jpg";

            var contenedor = await ContenedorAsync(ct);
            var blob = contenedor.GetBlobClient(ruta);
            await blob.UploadAsync(
                BinaryData.FromBytes(foto),
                new BlobUploadOptions
                {
                    HttpHeaders = new BlobHttpHeaders { ContentType = "image/jpeg" },
                    Metadata = new Dictionary<string, string>
                    {
                        ["resultado"] = resultado,
                        ["probabilidad"] = probabilidad.ToString("F4", CultureInfo.InvariantCulture)
                    }
                },
                ct);
            return ruta;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "No se pudo subir la foto a Blob Storage");
            return null;
        }
    }

    public async Task<IReadOnlyList<FotoDto>> ListarAsync(int max, CancellationToken ct = default)
    {
        var resultado = new List<FotoDto>();
        if (!Configurado)
        {
            return resultado;
        }

        var contenedor = await ContenedorAsync(ct);

        // Busca día por día (hoy hacia atrás) para no listar todo el contenedor.
        for (var dia = 0; dia < 14 && resultado.Count < max; dia++)
        {
            var fecha = DateTime.Now.Date.AddDays(-dia);
            var prefijo = fecha.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + "/";
            var delDia = new List<FotoDto>();

            await foreach (var item in contenedor.GetBlobsAsync(traits: BlobTraits.None, states: BlobStates.None, prefix: prefijo, cancellationToken: ct))
            {
                var foto = ConvertirAFoto(contenedor, item.Name, fecha);
                if (foto is not null)
                {
                    delDia.Add(foto);
                }
            }

            resultado.AddRange(delDia.OrderByDescending(f => f.Hora));
        }

        return resultado.Take(max).ToList();
    }

    private static FotoDto? ConvertirAFoto(BlobContainerClient contenedor, string ruta, DateTime fecha)
    {
        // 01-34-22_autorizado_puerta_Paola
        var nombre = Path.GetFileNameWithoutExtension(ruta);
        var partes = nombre.Split('_', 4);
        if (partes.Length < 4 || partes[0].Length < 8)
        {
            return null;
        }

        if (!TimeSpan.TryParse(partes[0][..8].Replace('-', ':'), CultureInfo.InvariantCulture, out var hora))
        {
            return null;
        }

        var blob = contenedor.GetBlobClient(ruta);
        var url = blob.CanGenerateSasUri
            ? blob.GenerateSasUri(BlobSasPermissions.Read, DateTimeOffset.UtcNow.AddMinutes(30)).ToString()
            : blob.Uri.ToString();

        return new FotoDto(ruta, url, fecha.Date + hora, partes[1], partes[2], partes[3].Replace('_', ' '));
    }

    public async Task<(bool Ok, string Mensaje)> ProbarAsync(CancellationToken ct = default)
    {
        if (!Configurado)
        {
            return (false, "Falta Blob:AccountName y Blob:AccountKey en appsettings.Local.json.");
        }

        try
        {
            var contenedor = await ContenedorAsync(ct);
            var existe = await contenedor.ExistsAsync(ct);
            return existe.Value
                ? (true, $"Contenedor '{_o.Container}' listo.")
                : (false, $"No se pudo crear el contenedor '{_o.Container}'.");
        }
        catch (Exception ex)
        {
            return (false, "Azure Blob respondió con error: " + ex.Message);
        }
    }
}
