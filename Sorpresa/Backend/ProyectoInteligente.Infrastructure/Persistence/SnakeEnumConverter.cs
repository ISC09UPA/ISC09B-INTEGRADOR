using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ProyectoInteligente.Infrastructure.Persistence;

// Guarda los enums como en la base MySQL: EnEspera <-> en_espera, AccesoDenegado <-> acceso_denegado
public class SnakeEnumConverter<T>() : ValueConverter<T, string>(
    v => Regex.Replace(v.ToString(), "(?<!^)([A-Z])", "_$1").ToLower(),
    s => Enum.Parse<T>(s.Replace("_", ""), true)) where T : struct, Enum;
