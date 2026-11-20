using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Infrastructure.Options;
using ProyectoInteligente.Infrastructure.Repositories;
using ProyectoInteligente.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Opciones de configuración para Azure
var visionOptions = builder.Configuration.GetSection("AzureVision").Get<AzureVisionOptions>()
    ?? new AzureVisionOptions();

var openAiOptions = builder.Configuration.GetSection("AzureOpenAI").Get<AzureOpenAIOptions>()
    ?? new AzureOpenAIOptions();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Cliente HTTP para Azure OpenAI
builder.Services.AddHttpClient();

// Inyección de dependencias
builder.Services.AddSingleton<IPatientRepository, PatientRepository>();
builder.Services.AddSingleton(visionOptions);
builder.Services.AddSingleton(openAiOptions);
builder.Services.AddSingleton<IPeopleCounterService, AzureVisionPeopleCounterService>();
builder.Services.AddSingleton<IAzureOpenAIService, AzureOpenAIService>();
builder.Services.AddSingleton<IIntegracionService, IntegracionService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Proyecto Integrador - API v1");
});

app.MapGet("/", () => Results.Redirect("/swagger"));

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
