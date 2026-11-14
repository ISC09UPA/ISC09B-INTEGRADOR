using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/images")]
public class ImagesController : ControllerBase
{
    private readonly IImageClassificationService _service;
    public ImagesController(IImageClassificationService service) => _service = service;

    [HttpPost("classify")]
    public async Task<ActionResult<ImageClassificationResultDto>> Classify(
        [FromBody] ClassifyRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.BlobName)) return BadRequest("BlobName es obligatorio.");
        try { return Ok(await _service.ClassifyBlobAsync(request.BlobName, ct)); }
        catch (FileNotFoundException ex) { return NotFound(ex.Message); }
    }
}
