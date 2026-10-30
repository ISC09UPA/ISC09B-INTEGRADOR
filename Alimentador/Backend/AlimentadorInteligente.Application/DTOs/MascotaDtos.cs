using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Application.DTOs;

public record MascotaDto(
    int Id, int AlimentadorId, string Nombre, Especie Especie, double PesoKg, int EdadMeses,
    NivelActividad NivelActividad, bool Esterilizado, int ComidasPorDia, string? EtiquetaRfid,
    double AjustePorcentaje, double GramosPorDiaRecomendados, double GramosPorComida);

public record GuardarMascotaRequest(
    string Nombre, Especie Especie, double PesoKg, int EdadMeses, NivelActividad NivelActividad,
    bool Esterilizado, int ComidasPorDia, string? EtiquetaRfid);

public record HorarioDto(int Id, int? MascotaId, TimeOnly Hora, bool Activo);
public record GuardarHorarioRequest(int? MascotaId, TimeOnly Hora, bool Activo);
