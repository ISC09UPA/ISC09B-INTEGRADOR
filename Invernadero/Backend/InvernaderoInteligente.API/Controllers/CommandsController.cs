using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/commands")]
public sealed class CommandsController : ControllerBase
{
    private readonly IBusServices _bus;
    public CommandsController(IBusServices bus) => _bus = bus;

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] ComandoDto comando, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(comando.Dispositivo) || string.IsNullOrWhiteSpace(comando.Comando))
            return BadRequest("Dispositivo y Comando son obligatorios.");
        await _bus.EnviarComandoAsync(comando, ct);
        return Accepted(new { mensaje = "Comando enviado a Service Bus." });
    }
}
