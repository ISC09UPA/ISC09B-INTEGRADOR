public sealed record LoteLecturas(
    string Dispositivo,
    double? TemperaturaC,
    IReadOnlyList<LecturaMaceta> Macetas,
    string NivelTanque = "");
public sealed record LecturaMaceta(string Maceta, double Humedad, double? TemperaturaC = null);
