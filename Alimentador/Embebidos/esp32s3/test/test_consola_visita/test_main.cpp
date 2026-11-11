#include <math.h>
#include <string.h>
#include <unity.h>

#include "logica/consola.h"
#include "logica/visita.h"

using namespace logica;

void setUp() {}
void tearDown() {}

void test_consola_comandos_validos() {
  LineaConsola l;
  TEST_ASSERT_EQUAL(ErrorConsola::Ok, interpretarLinea("  dispensar 2 35.5 ", l));
  TEST_ASSERT_EQUAL(OrdenConsola::Dispensar, l.orden);
  TEST_ASSERT_EQUAL(2, l.numero);
  TEST_ASSERT_EQUAL_DOUBLE(35.5, l.valor);

  TEST_ASSERT_EQUAL(ErrorConsola::Ok, interpretarLinea("TARA 1", l));
  TEST_ASSERT_EQUAL(OrdenConsola::Tara, l.orden);
  TEST_ASSERT_EQUAL(1, l.numero);

  TEST_ASSERT_EQUAL(ErrorConsola::Ok, interpretarLinea("CALIBRAR_BASCULA 2 500", l));
  TEST_ASSERT_EQUAL(OrdenConsola::CalibrarBascula, l.orden);
  TEST_ASSERT_EQUAL_DOUBLE(500, l.valor);

  TEST_ASSERT_EQUAL(ErrorConsola::Ok, interpretarLinea("calibrar_flujo 1 5", l));
  TEST_ASSERT_EQUAL(OrdenConsola::CalibrarFlujo, l.orden);

  TEST_ASSERT_EQUAL(ErrorConsola::Ok, interpretarLinea("NIVEL_LLENO 2", l));
  TEST_ASSERT_EQUAL(OrdenConsola::NivelLleno, l.orden);
  TEST_ASSERT_EQUAL(ErrorConsola::Ok, interpretarLinea("estado", l));
  TEST_ASSERT_EQUAL(OrdenConsola::Estado, l.orden);
}

void test_consola_errores() {
  LineaConsola l;
  l.numero = 9;
  TEST_ASSERT_EQUAL(ErrorConsola::Vacia, interpretarLinea("   ", l));
  TEST_ASSERT_EQUAL(ErrorConsola::Desconocida, interpretarLinea("DISPENSARTODO 1 5", l));
  TEST_ASSERT_EQUAL(ErrorConsola::Desconocida, interpretarLinea("UNA_PALABRA_LARGUISIMA_QUE_NO_CABE 1", l));
  TEST_ASSERT_EQUAL(ErrorConsola::FaltaArgumento, interpretarLinea("DISPENSAR 1", l));
  TEST_ASSERT_EQUAL(ErrorConsola::FaltaArgumento, interpretarLinea("TARA", l));
  TEST_ASSERT_EQUAL(ErrorConsola::ArgumentoInvalido, interpretarLinea("DISPENSAR 1 50abc", l));
  TEST_ASSERT_EQUAL(ErrorConsola::ArgumentoInvalido, interpretarLinea("TARA uno", l));
  TEST_ASSERT_EQUAL(ErrorConsola::FueraDeRango, interpretarLinea("DISPENSAR 3 50", l));
  TEST_ASSERT_EQUAL(ErrorConsola::FueraDeRango, interpretarLinea("DISPENSAR 1 0", l));
  TEST_ASSERT_EQUAL(ErrorConsola::FueraDeRango, interpretarLinea("DISPENSAR 1 401", l));
  TEST_ASSERT_EQUAL(ErrorConsola::FueraDeRango, interpretarLinea("DISPENSAR 1 nan", l));
  TEST_ASSERT_EQUAL(ErrorConsola::FueraDeRango, interpretarLinea("CALIBRAR_FLUJO 1 31", l));
  TEST_ASSERT_EQUAL(ErrorConsola::Sobrante, interpretarLinea("DISPENSAR 1 50 60", l));
  TEST_ASSERT_EQUAL(ErrorConsola::Sobrante, interpretarLinea("ESTADO ya", l));
  TEST_ASSERT_EQUAL(9, l.numero);  // los errores no tocan la salida
  TEST_ASSERT_NOT_NULL(strstr(textoErrorConsola(ErrorConsola::Desconocida), "AYUDA"));
}

void test_uuid_v4() {
  uint8_t bytes[16];
  for (int i = 0; i < 16; i++) bytes[i] = static_cast<uint8_t>(0xF0 + i);
  std::string id = uuidV4(bytes);
  TEST_ASSERT_EQUAL(36, id.size());
  TEST_ASSERT_EQUAL_STRING("f0f1f2f3-f4f5-46f7-b8f9-fafbfcfdfeff", id.c_str());
  uint8_t ceros[16] = {};
  TEST_ASSERT_EQUAL_STRING("00000000-0000-4000-8000-000000000000", uuidV4(ceros).c_str());
}

void test_plato_de_visita() {
  TEST_ASSERT_EQUAL(1, platoDeVisita(Clase::Perro, 0, -20));
  TEST_ASSERT_EQUAL(2, platoDeVisita(Clase::Gato, -50, 0));
  TEST_ASSERT_EQUAL(2, platoDeVisita(Clase::Nada, -1, -6));
  TEST_ASSERT_EQUAL(1, platoDeVisita(Clase::Nada, -8, 2));
  TEST_ASSERT_EQUAL(1, platoDeVisita(Clase::Nada, NAN, NAN));
}

void test_fin_de_visita() {
  // Ausencia de 20 s o 15 min de duración.
  TEST_ASSERT_FALSE(visitaTermino(30000, 0, 15000, 20000, 900000));
  TEST_ASSERT_TRUE(visitaTermino(35000, 0, 15000, 20000, 900000));
  TEST_ASSERT_TRUE(visitaTermino(900000, 0, 899000, 20000, 900000));
  // Con desborde de millis().
  TEST_ASSERT_FALSE(visitaTermino(5000, 0xFFFFF000u, 4000, 20000, 900000));
}

void test_que_visitas_se_publican() {
  TEST_ASSERT_TRUE(debePublicarVisita(Clase::Gato, 0, 0, 2));
  TEST_ASSERT_FALSE(debePublicarVisita(Clase::Nada, 0, 0.5, 2));
  TEST_ASSERT_FALSE(debePublicarVisita(Clase::Nada, 0, NAN, 2));
  TEST_ASSERT_TRUE(debePublicarVisita(Clase::Nada, 0, -12, 2));
  TEST_ASSERT_TRUE(debePublicarVisita(Clase::Nada, 10, 0, 2));
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_consola_comandos_validos);
  RUN_TEST(test_consola_errores);
  RUN_TEST(test_uuid_v4);
  RUN_TEST(test_plato_de_visita);
  RUN_TEST(test_fin_de_visita);
  RUN_TEST(test_que_visitas_se_publican);
  return UNITY_END();
}
