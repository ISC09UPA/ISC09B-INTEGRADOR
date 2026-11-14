using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public static class ImageClassificationRegistration
{
    public static IServiceCollection AddImageClassification(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<BlobStorageOptions>(config.GetSection("AzureBlob"));
        services.Configure<CustomVisionOptions>(config.GetSection("CustomVision"));
        services.AddSingleton<IBlobStorageService, BlobStorageService>();
        services.AddHttpClient<ICustomVisionClient, CustomVisionClient>();
        services.AddScoped<IImageClassificationService, ImageClassificationService>();
        return services;
    }
}
