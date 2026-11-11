#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unity.h>

#include "logica/planificador.h"

using namespace logica;

namespace {

// 2026-11-10 00:00 en Ciudad de México (UTC-6) = 2026-11-10 06:00 UTC.
constexpr int64_t MEDIANOCHE = 1794290400;
constexpr int64_t H = 3600;

ConfigAlimentador configBase() {
  ConfigAlimentador c;
  c.feederId = "ALIM-001";
  c.version = 1;
  c.minIntervalHours = 4;
  Mascota perro;
  perro.id = 3;
  perro.especie = Clase::Perro;
  perro.tolva = 1;
  perro.gramosPorComida = 150;
  perro.rfid = "0A00B1C2D3";
  Mascota gato;
  gato.id = 4;
  gato.especie = Clase::Gato;
  gato.tolva = 2;
  gato.gramosPorComida = 40;
  c.mascotas = {perro, gato};
  c.horarios = {{3, 8 * 60}, {3, 19 * 60}, {SIN_MASCOTA, 23 * 60 + 30}};
  return c;
}

ComidaDisponible disponible(const ConfigAlimentador& c, int pet, int64_t ahora, int64_t ultima) {
  return comidaDisponible(c, pet, ahora, MEDIANOCHE, ultima, 180);
}

}  // namespace

void setUp() {}
void tearDown() {}

void test_medianoche_con_hora_local() {
  setenv("TZ", "CST6", 1);
  tzset();
  time_t ahora = static_cast<time_t>(MEDIANOCHE + 8 * H + 15 * 60 + 7);
  struct tm local;
  localtime_r(&ahora, &local);
  TEST_ASSERT_EQUAL(8, local.tm_hour);
  TEST_ASSERT_EQUAL_INT64(MEDIANOCHE,
                          medianocheDesde(ahora, local.tm_hour, local.tm_min, local.tm_sec));
}

void test_antes_del_primer_horario_no_hay_comida() {
  ConfigAlimentador c = configBase();
  TEST_ASSERT_FALSE(disponible(c, 3, MEDIANOCHE + 7 * H, 0).disponible);
}

void test_horario_abre_ventana_y_se_cierra_al_servir() {
  ConfigAlimentador c = configBase();
  ComidaDisponible d = disponible(c, 3, MEDIANOCHE + 8 * H + 60, 0);
  TEST_ASSERT_TRUE(d.disponible);
  TEST_ASSERT_EQUAL_INT64(MEDIANOCHE + 8 * H, d.inicio);
  // Ya comió a las 8:05: no se repite.
  TEST_ASSERT_FALSE(disponible(c, 3, MEDIANOCHE + 8 * H + 600, MEDIANOCHE + 8 * H + 300).disponible);
  // A las 19:00 abre la siguiente.
  TEST_ASSERT_TRUE(disponible(c, 3, MEDIANOCHE + 19 * H + 60, MEDIANOCHE + 8 * H + 300).disponible);
}

void test_ventana_vence() {
  ConfigAlimentador c = configBase();
  TEST_ASSERT_TRUE(disponible(c, 3, MEDIANOCHE + 11 * H, 0).disponible);
  TEST_ASSERT_FALSE(disponible(c, 3, MEDIANOCHE + 11 * H + 60, 0).disponible);
}

void test_intervalo_minimo_entre_comidas() {
  ConfigAlimentador c = configBase();
  // Un dispensado manual a las 6:00 bloquea la comida de las 8:00 hasta las 10:00.
  int64_t manual = MEDIANOCHE + 6 * H;
  TEST_ASSERT_FALSE(disponible(c, 3, MEDIANOCHE + 8 * H + 60, manual).disponible);
  TEST_ASSERT_TRUE(disponible(c, 3, MEDIANOCHE + 10 * H, manual).disponible);
  c.minIntervalHours = 0;
  TEST_ASSERT_TRUE(disponible(c, 3, MEDIANOCHE + 8 * H + 60, manual).disponible);
}

void test_horario_para_todas_y_cruce_de_medianoche() {
  ConfigAlimentador c = configBase();
  // El gato solo tiene el horario general de las 23:30.
  TEST_ASSERT_FALSE(disponible(c, 4, MEDIANOCHE + 20 * H, 0).disponible);
  TEST_ASSERT_TRUE(disponible(c, 4, MEDIANOCHE + 23 * H + 45 * 60, 0).disponible);
  // 00:30 del día siguiente: sigue abierta la de las 23:30 de ayer.
  int64_t manana = MEDIANOCHE + 24 * H;
  ComidaDisponible d = comidaDisponible(c, 4, manana + 30 * 60, manana, 0, 180);
  TEST_ASSERT_TRUE(d.disponible);
  TEST_ASSERT_EQUAL_INT64(MEDIANOCHE + 23 * H + 30 * 60, d.inicio);
}

void test_mascota_desconocida_o_sin_horarios() {
  ConfigAlimentador c = configBase();
  TEST_ASSERT_FALSE(disponible(c, 99, MEDIANOCHE + 8 * H, 0).disponible);
  c.horarios.clear();
  TEST_ASSERT_FALSE(disponible(c, 3, MEDIANOCHE + 8 * H, 0).disponible);
}

void test_identificar_por_especie_y_rfid() {
  ConfigAlimentador c = configBase();
  auto nadie = [](int) { return false; };
  Identificacion id = identificarMascota(c, Clase::Gato, "", nadie);
  TEST_ASSERT_EQUAL(4, id.petId);
  TEST_ASSERT_FALSE(id.porRfid);
  id = identificarMascota(c, Clase::Perro, "0a00b1c2d3", nadie);
  TEST_ASSERT_EQUAL(3, id.petId);
  TEST_ASSERT_TRUE(id.porRfid);
  TEST_ASSERT_EQUAL(SIN_MASCOTA, identificarMascota(c, Clase::Paloma, "", nadie).petId);
  TEST_ASSERT_EQUAL(SIN_MASCOTA, identificarMascota(c, Clase::Nada, "", nadie).petId);
}

void test_dos_perros_sin_rfid_usa_quien_tiene_comida() {
  ConfigAlimentador c = configBase();
  Mascota otro;
  otro.id = 5;
  otro.especie = Clase::Perro;
  otro.tolva = 1;
  otro.gramosPorComida = 90;
  otro.rfid = "11223344";  // número decimal del llavero
  c.mascotas.push_back(otro);

  TEST_ASSERT_EQUAL(SIN_MASCOTA, identificarMascota(c, Clase::Perro, "", [](int) { return false; }).petId);
  TEST_ASSERT_EQUAL(SIN_MASCOTA, identificarMascota(c, Clase::Perro, "", [](int) { return true; }).petId);
  TEST_ASSERT_EQUAL(5, identificarMascota(c, Clase::Perro, "", [](int p) { return p == 5; }).petId);
  TEST_ASSERT_EQUAL(2, identificarMascota(c, Clase::Perro, "", nullptr).candidatos);

  // 11223344 decimal = 0x00AB4130.
  Identificacion id = identificarMascota(c, Clase::Perro, "1F00AB4130", [](int) { return true; });
  TEST_ASSERT_EQUAL(5, id.petId);
  TEST_ASSERT_TRUE(id.porRfid);
}

void test_rfid_coincide() {
  TEST_ASSERT_TRUE(rfidCoincide("0A00B1C2D3", "0a00b1c2d3"));
  TEST_ASSERT_TRUE(rfidCoincide(" 0a00 b1c2d3 ", "0A00B1C2D3"));
  TEST_ASSERT_TRUE(rfidCoincide("0011223344", "1F00AB4130"));
  TEST_ASSERT_TRUE(rfidCoincide("11223344", "1F00AB4130"));
  TEST_ASSERT_FALSE(rfidCoincide("11223345", "1F00AB4130"));
  TEST_ASSERT_FALSE(rfidCoincide("", "1F00AB4130"));
  TEST_ASSERT_FALSE(rfidCoincide("0A00B1C2D3", ""));
}

void test_zonas_horarias() {
  TEST_ASSERT_EQUAL_STRING("CST6", zonaPosix("America/Mexico_City"));
  TEST_ASSERT_EQUAL_STRING("PST8PDT,M3.2.0,M11.1.0", zonaPosix("America/Tijuana"));
  TEST_ASSERT_NULL(zonaPosix("Marte/Olympus"));
  TEST_ASSERT_NULL(zonaPosix(nullptr));
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_medianoche_con_hora_local);
  RUN_TEST(test_antes_del_primer_horario_no_hay_comida);
  RUN_TEST(test_horario_abre_ventana_y_se_cierra_al_servir);
  RUN_TEST(test_ventana_vence);
  RUN_TEST(test_intervalo_minimo_entre_comidas);
  RUN_TEST(test_horario_para_todas_y_cruce_de_medianoche);
  RUN_TEST(test_mascota_desconocida_o_sin_horarios);
  RUN_TEST(test_identificar_por_especie_y_rfid);
  RUN_TEST(test_dos_perros_sin_rfid_usa_quien_tiene_comida);
  RUN_TEST(test_rfid_coincide);
  RUN_TEST(test_zonas_horarias);
  return UNITY_END();
}
