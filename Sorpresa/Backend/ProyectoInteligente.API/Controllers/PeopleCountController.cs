using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Application.Mappings;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/[controller]")]
public class PeopleCountController : ControllerBase
{
    private static readonly string[] AllowedTypes = { "image/jpeg", "image/png", "image/bmp" };
    private const long MaxBytes = 20 * 1024 * 1024;

    private readonly IPeopleCounterService _visionService;
    private readonly IAzureOpenAIService _openAiService;
    private readonly IIntegracionService _integracionService;

    public PeopleCountController(
        IPeopleCounterService visionService,
        IAzureOpenAIService openAiService,
        IIntegracionService integracionService)
    {
        _visionService = visionService;
        _openAiService = openAiService;
        _integracionService = integracionService;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PeopleCountDto>> Count(IFormFile image, CancellationToken cancellationToken)
    {
        if (image == null || image.Length == 0)
            return BadRequest("Debes enviar una imagen.");

        if (image.Length > MaxBytes)
            return BadRequest("La imagen supera los 20 MB.");

        if (!AllowedTypes.Contains(image.ContentType))
            return BadRequest("Formato no soportado. Usa JPG, PNG o BMP.");

        string horaRegistro = DateTime.Now.ToString("HH:mm:ss");

        // 1. Análisis con Azure Vision
        await using var stream = image.OpenReadStream();
        var peopleCount = await _visionService.CountAsync(stream, cancellationToken);

        // 2. Azure OpenAI (gpt-4.1) sintetiza el texto crudo y genera el resumen JSON
        var resumenIa = await _openAiService.GenerarResumenAsync(
            peopleCount.ContextoCrudo,
            peopleCount.TotalPeople,
            horaRegistro
        );
        peopleCount.ResumenIa = resumenIa;

        // 3. Canalizar a Base de Datos MySQL
        _integracionService.GuardarEnDbSql(resumenIa);

        // 4. Canalizar hacia la App Móvil
        _integracionService.EnviarAAppMovil(resumenIa);

        // 5. Retornar el DTO con personas, hora y resumen
        return Ok(peopleCount.ToDto());
    }
}
