using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Infrastructure.Options;
using ProyectoInteligente.Infrastructure.Repositories;
using ProyectoInteligente.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

var visionOptions = builder.Configuration.GetSection("AzureVision").Get<AzureVisionOptions>()
    ?? new AzureVisionOptions();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<IPatientRepository, PatientRepository>();
builder.Services.AddSingleton(visionOptions);
builder.Services.AddSingleton<IPeopleCounterService, AzureVisionPeopleCounterService>();
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
