namespace ProyectoInteligente.Infrastructure.Options;

public class AzureOpenAIOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Deployment { get; set; } = "gpt-4.1";
    public string ApiVersion { get; set; } = "2024-08-01-preview";
}
