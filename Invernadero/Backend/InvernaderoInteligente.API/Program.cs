using Azure.Messaging.ServiceBus;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();
builder.Services.AddImageClassification(builder.Configuration);
builder.Services.Configure<ServiceBusSettings>(builder.Configuration.GetSection("ServiceBus"));
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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();


