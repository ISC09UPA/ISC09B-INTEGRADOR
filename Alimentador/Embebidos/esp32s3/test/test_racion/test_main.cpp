#include <math.h>
#include <unity.h>

#include "logica/racion.h"

using namespace logica;
using Estado = ControlDispensado::Estado;

void setUp() {}
void tearDown() {}

void test_racion_rellena_hasta_el_objetivo() {
  TEST_ASSERT_EQUAL_DOUBLE(30.0, calcularRacion(30, 0, true, 2, 400));
  TEST_ASSERT_EQUAL_DOUBLE(20.0, calcularRacion(30, 10, true, 2, 400));
  TEST_ASSERT_EQUAL_DOUBLE(30.0, calcularRacion(30, 10, false, 2, 400));
  // Plato ya lleno o casi: no se mueve el motor.
  TEST_ASSERT_EQUAL_DOUBLE(0.0, calcularRacion(30, 29, true, 2, 400));
  TEST_ASSERT_EQUAL_DOUBLE(0.0, calcularRacion(30, 45, true, 2, 400));
  // Báscula sin lectura: se da la ración completa.
  TEST_ASSERT_EQUAL_DOUBLE(30.0, calcularRacion(30, NAN, true, 2, 400));
  // Lecturas negativas por deriva no suman.
  TEST_ASSERT_EQUAL_DOUBLE(30.0, calcularRacion(30, -1.5, true, 2, 400));
  TEST_ASSERT_EQUAL_DOUBLE(400.0, calcularRacion(500, 0, true, 2, 400));
  TEST_ASSERT_EQUAL_DOUBLE(0.0, calcularRacion(0, 0, true, 2, 400));
}

void test_calibraciones() {
  TEST_ASSERT_EQUAL_DOUBLE(8.0, calibrarFlujo(40, 5));
  TEST_ASSERT_EQUAL_DOUBLE(0.0, calibrarFlujo(0, 5));
  TEST_ASSERT_EQUAL_DOUBLE(0.0, calibrarFlujo(40, 0));
  TEST_ASSERT_EQUAL_DOUBLE(420.0, calibrarEscala(1000 + 420 * 100, 1000, 100));
  TEST_ASSERT_EQUAL_DOUBLE(-420.0, calibrarEscala(1000 - 420 * 100, 1000, 100));
  TEST_ASSERT_EQUAL_DOUBLE(0.0, calibrarEscala(1000, 1000, 100));
  TEST_ASSERT_EQUAL_DOUBLE(0.0, calibrarEscala(5000, 1000, 0));
  TEST_ASSERT_EQUAL_UINT32(3750, msParaGramos(30, 8));
  TEST_ASSERT_EQUAL_UINT32(0, msParaGramos(30, 0));
}

void test_dispensado_normal_se_detiene_con_anticipacion() {
  ParametrosDispensado p;  // 8 g/s, anticipación 2 g, asentar 1.5 s
  ControlDispensado c;
  c.iniciar(30, 5, 0, p);
  TEST_ASSERT_TRUE(c.motorEncendido());

  // El plato sube 8 g/s; a los 3.5 s hay 28 g dispensados = objetivo - anticipación.
  uint32_t t = 0;
  double peso = 5;
  while (c.estado() == Estado::Girando && t < 10000) {
    t += 250;
    peso += 2;
    c.paso(t, peso);
  }
  TEST_ASSERT_EQUAL(Estado::Asentando, c.estado());
  TEST_ASSERT_EQUAL_UINT32(3500, t);
  TEST_ASSERT_FALSE(c.motorEncendido());

  // Cae lo que estaba en el aire y se estabiliza.
  c.paso(t + 500, peso + 2);
  TEST_ASSERT_EQUAL(Estado::Asentando, c.estado());
  c.paso(t + 1500, peso + 2);
  TEST_ASSERT_EQUAL(Estado::Terminado, c.estado());
  TEST_ASSERT_TRUE(c.exitoso());
  TEST_ASSERT_EQUAL_DOUBLE(30.0, c.dispensadoG());
}

void test_atasco_si_el_peso_no_sube() {
  ParametrosDispensado p;
  ControlDispensado c;
  c.iniciar(30, 0, 1000, p);
  c.paso(2000, 0.5);
  c.paso(4000, 0.6);
  TEST_ASSERT_EQUAL(Estado::Girando, c.estado());
  c.paso(5000, 0.7);  // 4 s sin subir 1 g
  TEST_ASSERT_EQUAL(Estado::Atasco, c.estado());
  TEST_ASSERT_FALSE(c.motorEncendido());
  TEST_ASSERT_FALSE(c.exitoso());

  // Tras el desatasco vuelve a girar y termina.
  c.reanudar(6000, 0.7);
  TEST_ASSERT_EQUAL(Estado::Girando, c.estado());
  c.paso(8000, 15);
  c.paso(9000, 29);
  TEST_ASSERT_EQUAL(Estado::Asentando, c.estado());
  c.paso(11000, 30);
  TEST_ASSERT_TRUE(c.exitoso());
}

void test_flujo_lento_no_es_atasco_pero_agota_tiempo() {
  ParametrosDispensado p;
  p.gramosPorSegundo = 10;  // estimado 3 s -> máximo 3 * 2.5 + 5 = 12.5 s
  ControlDispensado c;
  c.iniciar(30, 0, 0, p);
  double peso = 0;
  uint32_t t = 0;
  while (c.estado() == Estado::Girando) {
    t += 1000;
    peso += 1.2;  // sube lento pero sube
    c.paso(t, peso);
  }
  TEST_ASSERT_EQUAL(Estado::TiempoAgotado, c.estado());
  TEST_ASSERT_EQUAL_UINT32(13000, t);
  TEST_ASSERT_FALSE(c.exitoso());  // 15.6 g de 30
}

void test_lecturas_invalidas_no_rompen_el_control() {
  ParametrosDispensado p;
  ControlDispensado c;
  c.iniciar(10, NAN, 0, p);
  c.paso(500, NAN);
  TEST_ASSERT_EQUAL(Estado::Girando, c.estado());
  c.paso(1000, 9);
  TEST_ASSERT_EQUAL(Estado::Asentando, c.estado());
  TEST_ASSERT_EQUAL_DOUBLE(9.0, c.dispensadoG());
}

void test_cancelar_y_desborde_de_millis() {
  ParametrosDispensado p;
  ControlDispensado c;
  uint32_t inicio = 0xFFFFF000u;  // millis() a punto de desbordarse
  c.iniciar(30, 0, inicio, p);
  c.paso(inicio + 3000, 5);
  TEST_ASSERT_EQUAL(Estado::Girando, c.estado());
  c.paso(inicio + 5000, 12);  // ya pasó el desborde
  TEST_ASSERT_EQUAL(Estado::Girando, c.estado());
  c.cancelar();
  TEST_ASSERT_FALSE(c.activo());
  TEST_ASSERT_EQUAL_DOUBLE(12.0, c.dispensadoG());
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_racion_rellena_hasta_el_objetivo);
  RUN_TEST(test_calibraciones);
  RUN_TEST(test_dispensado_normal_se_detiene_con_anticipacion);
  RUN_TEST(test_atasco_si_el_peso_no_sube);
  RUN_TEST(test_flujo_lento_no_es_atasco_pero_agota_tiempo);
  RUN_TEST(test_lecturas_invalidas_no_rompen_el_control);
  RUN_TEST(test_cancelar_y_desborde_de_millis);
  return UNITY_END();
}
