using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ProyectoInteligente.Infrastructure.Persistence;

public class UtcConverter() : ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
