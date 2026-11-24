using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/images")]
public class ImagesController : ControllerBase
{
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp"
    };

    private readonly IImageClassificationService _service;
    private readonly IBlobStorageService _blobs;

    public ImagesController(IImageClassificationService service, IBlobStorageService blobs)
    {
        _service = service;
        _blobs = blobs;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxImageSizeBytes + 64 * 1024)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("Selecciona una imagen.");
        if (file.Length > MaxImageSizeBytes) return BadRequest("La imagen no puede superar 5 MB.");
        if (!AllowedContentTypes.Contains(file.ContentType))
            return BadRequest("Formato no permitido. Usa JPG, PNG o WEBP.");

        try
        {
            await using var stream = file.OpenReadStream();
            var blobName = await _blobs.UploadPhotoAsync(stream, file.FileName, file.ContentType, ct);
            return Ok(new { blobName, message = "Imagen guardada. Usa blobName en POST /api/images/classify." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("classify")]
    public async Task<ActionResult<ImageClassificationResultDto>> Classify(
        [FromBody] ClassifyRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.BlobName)) return BadRequest("BlobName es obligatorio.");
        try { return Ok(await _service.ClassifyBlobAsync(request.BlobName, ct)); }
        catch (FileNotFoundException ex) { return NotFound(ex.Message); }
    }
}

