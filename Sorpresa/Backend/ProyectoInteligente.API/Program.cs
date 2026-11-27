using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProyectoInteligente.Application.Common.Interfaces;
using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Infrastructure.Auth;
using ProyectoInteligente.Infrastructure.Options;
using ProyectoInteligente.Infrastructure.Persistence;
using ProyectoInteligente.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

var visionOptions = builder.Configuration.GetSection("AzureVision").Get<AzureVisionOptions>() ?? new AzureVisionOptions();
var openAiOptions = builder.Configuration.GetSection("AzureOpenAI").Get<AzureOpenAIOptions>() ?? new AzureOpenAIOptions();

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(
    builder.Configuration.GetConnectionString("DefaultConnection"),
    sql => sql.EnableRetryOnFailure()));
builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        RoleClaimType = "role",
        NameClaimType = "name"
    };
});
builder.Services.AddAuthorization();

// Azure Vision + Azure OpenAI (from feature/computer-vision-api)
builder.Services.AddHttpClient();
builder.Services.AddSingleton(visionOptions);
builder.Services.AddSingleton(openAiOptions);
builder.Services.AddSingleton<IPeopleCounterService, AzureVisionPeopleCounterService>();
builder.Services.AddSingleton<IAzureOpenAIService, AzureOpenAIService>();
builder.Services.AddSingleton<IIntegracionService, IntegracionService>();

builder.Services.AddCors(o => o.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        await DbSeeder.RunAsync(db);
    }
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
