public sealed record LoteLecturas(string Dispositivo, double TemperaturaC, IReadOnlyList<LecturaMaceta> Macetas);
public sealed record LecturaMaceta(string Maceta, double Humedad, double? TemperaturaC = null);
