using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using AlimentadorInteligente.Domain.Services;

namespace AlimentadorInteligente.Tests;

public class DominioTests
{
    private static readonly (double, double)[] DiasCompletos = [(100, 100), (100, 100), (100, 100)];

    [Fact]
    public void Gato_de_4kg_con_alimento_de_3_5_kcal()
    {
        var gato = new Mascota { Especie = Especie.Gato, PesoKg = 4, ComidasPorDia = 2 };

        // RER ≈ 198 kcal; × 1.2 ≈ 237.6 kcal; / 3.5 ≈ 67.9 g
        Assert.Equal(67.9, CalculadoraRacion.GramosPorDia(gato, 3.5), precision: 1);
        Assert.Equal(33.9, CalculadoraRacion.GramosPorComida(gato, 3.5), precision: 1);
    }

    [Fact]
    public void Cada_especie_usa_su_tolva()
    {
        Assert.Equal(Mascota.TolvaPerro, new Mascota { Especie = Especie.Perro }.Tolva);
        Assert.Equal(Mascota.TolvaGato, new Mascota { Especie = Especie.Gato }.Tolva);
    }

    [Theory]
    [InlineData(3.1, 31.2, 5.0, 29.3)]
    [InlineData(0, 10, 15, 0)]
    public void Consumo_considera_lo_que_ya_habia_en_el_plato(double antes, double dispensado, double despues, double esperado)
        => Assert.Equal(esperado, Visita.CalcularConsumo(antes, dispensado, despues));

    [Fact]
    public void Baja_5_si_consume_menos_del_85_por_ciento()
        => Assert.Equal(-5, CalculadoraRacion.CalcularNuevoAjuste(0, [(100, 80), (100, 80), (100, 80)]));

    [Fact]
    public void Sube_5_si_se_comio_todo_los_3_dias()
        => Assert.Equal(5, CalculadoraRacion.CalcularNuevoAjuste(0, DiasCompletos));

    [Fact]
    public void El_ajuste_no_pasa_de_15_por_ciento()
        => Assert.Equal(15, CalculadoraRacion.CalcularNuevoAjuste(15, DiasCompletos));

    [Fact]
    public void Sin_datos_no_cambia_el_ajuste()
        => Assert.Equal(5, CalculadoraRacion.CalcularNuevoAjuste(5, [(0, 0), (0, 0), (0, 0)]));

    [Fact]
    public void El_dia_se_calcula_en_la_zona_del_alimentador()
    {
        const string zona = "America/Mexico_City";
        var noche = new DateTimeOffset(2026, 11, 5, 5, 30, 0, TimeSpan.Zero);

        Assert.Equal(new DateOnly(2026, 11, 4), CalendarioLocal.DiaDe(noche, zona));
        Assert.Equal("23:30", CalendarioLocal.Hora(noche, zona));
        Assert.Equal(new DateTimeOffset(2026, 11, 5, 6, 0, 0, TimeSpan.Zero),
            CalendarioLocal.InicioDe(new DateOnly(2026, 11, 5), zona));
    }

    [Fact]
    public void Un_dispensado_no_se_ejecuta_despues_de_2_minutos()
    {
        var ahora = DateTimeOffset.UtcNow;
        var comando = new Comando { Tipo = TipoComando.Dispensar, CreadoEn = ahora.AddMinutes(-3) };
        Assert.True(comando.EstaVencido(ahora));
    }
}
