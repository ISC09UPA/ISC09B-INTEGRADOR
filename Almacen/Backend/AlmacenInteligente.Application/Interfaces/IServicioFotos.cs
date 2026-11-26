namespace AlmacenInteligente.Application.Interfaces;

// Resultado de buscar una foto por su URL.
//   Ok = false: el servicio de almacenamiento no respondió.
//   Existe = false: la URL no es una foto guardada por /productos/identificar.
public record ConsultaFoto(bool Ok, bool Existe, string? Etiqueta);

// Fotos de productos en Azure Blob Storage.
public interface IServicioFotos
{
    bool Configurado { get; }

    // Guarda la foto y devuelve su URL, o null si falló. La etiqueta (opcional) se guarda en los metadatos
    // del blob para asignársela al producto si después se registra con /productos/desde-foto.
    Task<string?> GuardarAsync(byte[] contenido, string tipoContenido, string? etiqueta, CancellationToken ct = default);

    Task<ConsultaFoto> ConsultarAsync(string url, CancellationToken ct = default);
}
