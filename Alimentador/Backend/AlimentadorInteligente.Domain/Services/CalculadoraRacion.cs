using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Services;

/// <summary>Cálculo de ración recomendada (sección 9 de los requerimientos).</summary>
public static class CalculadoraRacion
{
    public const double AjusteMaximo = 15;
    public const double PasoAjuste = 5;

    public static double Rer(double pesoKg) => 70 * Math.Pow(pesoKg, 0.75);

    /// <summary>
    /// Factores aproximados: perro adulto esterilizado ≈ 1.6, gato adulto esterilizado ≈ 1.2.
    /// TODO: validar con veterinario o etiqueta del alimento.
    /// </summary>
    public static double FactorActividad(Mascota mascota)
    {
        var baseFactor = mascota.Especie == Especie.Perro ? 1.6 : 1.2;
        if (!mascota.Esterilizado) baseFactor += 0.2;
        return mascota.NivelActividad switch
        {
            NivelActividad.Bajo => baseFactor - 0.2,
            NivelActividad.Alto => baseFactor + 0.4,
            _ => baseFactor
        };
    }

    public static double GramosPorDia(Mascota mascota, double kcalPorGramo)
        => Rer(mascota.PesoKg) * FactorActividad(mascota) / kcalPorGramo;

    public static double GramosPorComida(Mascota mascota, double kcalPorGramo)
        => GramosPorDia(mascota, kcalPorGramo) * (1 + mascota.AjustePorcentaje / 100) / mascota.ComidasPorDia;

    /// <summary>
    /// Regla de ajuste gradual con los 3 días completos anteriores (RF-16).
    /// </summary>
    public static double CalcularNuevoAjuste(double ajusteActual, IReadOnlyList<(double dispensado, double consumido)> dias)
    {
        if (dias.Count < 3) return ajusteActual;

        double totalDispensado = dias.Sum(d => d.dispensado);
        double totalConsumido = dias.Sum(d => d.consumido);
        double nuevo = ajusteActual;

        if (totalDispensado > 0 && totalConsumido < totalDispensado * 0.85)
            nuevo -= PasoAjuste;
        else if (dias.All(d => d.dispensado > 0 && d.consumido >= d.dispensado))
            nuevo += PasoAjuste;

        return Math.Clamp(nuevo, -AjusteMaximo, AjusteMaximo);
    }
}
