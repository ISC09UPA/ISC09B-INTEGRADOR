using System.Text;
using Azure.Messaging.ServiceBus;
using InvernaderoInteligente.Application.Interfaces;
using InvernaderoInteligente.Infrastructure;
using InvernaderoInteligente.Infrastructure.ExternalServices;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using NSwag.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirTodo", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddImageClassification(builder.Configuration);
builder.Services.Configure<ServiceBusSettings>(builder.Configuration.GetSection("ServiceBus"));
builder.Services.Configure<MachineLearningSettings>(builder.Configuration.GetSection("MachineLearning"));
builder.Services.AddHttpClient<IMachinLearningService, MachinLearningService>();
builder.Services.AddScoped<IProcesarLecturasService, ProcesarLecturasService>();

var bus = builder.Configuration.GetSection("ServiceBus").Get<ServiceBusSettings>() ?? new ServiceBusSettings();
if (!string.IsNullOrWhiteSpace(bus.LecturasConnectionString))
{
    builder.Services.AddKeyedSingleton("lecturas", (_, _) => new ServiceBusClient(bus.LecturasConnectionString));
    builder.Services.AddHostedService<LecturasWorker>();
}
if (!string.IsNullOrWhiteSpace(bus.ComandosConnectionString))
{
    builder.Services.AddKeyedSingleton("comandos", (_, _) => new ServiceBusClient(bus.ComandosConnectionString));
    builder.Services.AddSingleton<IBusServices, BusService>();
}

var app = builder.Build();

app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUi(settings =>
    {
        settings.SwaggerRoutes.Add(new SwaggerUiRoute("Invernadero API", "/openapi/v1.json"));
    });
}
app.UseHttpsRedirection();

app.UseCors("PermitirTodo");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();


