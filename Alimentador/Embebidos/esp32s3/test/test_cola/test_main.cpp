#include <unity.h>

#include "logica/cola_salida.h"

using namespace logica;

void setUp() {}
void tearDown() {}

void test_orden_y_confirmacion_por_puback() {
  ColaSalida cola(10);
  uint32_t a = cola.agregar("feeder/A/visit", "{\"n\":1}");
  uint32_t b = cola.agregar("feeder/A/event", "{\"n\":2}");
  TEST_ASSERT_NOT_EQUAL(0, a);
  TEST_ASSERT_EQUAL(2, cola.tamano());

  const MensajeSalida* m = cola.siguientePendiente();
  TEST_ASSERT_EQUAL(a, m->seq);
  TEST_ASSERT_TRUE(cola.marcarEnVuelo(a, 101));
  m = cola.siguientePendiente();
  TEST_ASSERT_EQUAL(b, m->seq);
  TEST_ASSERT_TRUE(cola.marcarEnVuelo(b, 102));
  TEST_ASSERT_NULL(cola.siguientePendiente());
  TEST_ASSERT_EQUAL(2, cola.enVuelo());

  // Los PUBACK pueden llegar en cualquier orden.
  TEST_ASSERT_TRUE(cola.confirmar(102));
  TEST_ASSERT_FALSE(cola.confirmar(102));
  TEST_ASSERT_FALSE(cola.confirmar(999));
  TEST_ASSERT_EQUAL(1, cola.tamano());
  TEST_ASSERT_TRUE(cola.confirmar(101));
  TEST_ASSERT_TRUE(cola.vacia());
}

void test_desconexion_reenvia_lo_que_estaba_en_vuelo() {
  ColaSalida cola(10);
  uint32_t a = cola.agregar("t", "1");
  cola.agregar("t", "2");
  cola.marcarEnVuelo(a, 7);
  cola.reiniciarEnVuelo();
  TEST_ASSERT_EQUAL(0, cola.enVuelo());
  TEST_ASSERT_EQUAL(a, cola.siguientePendiente()->seq);
  // Un PUBACK viejo con el mismo id ya no confirma nada.
  TEST_ASSERT_FALSE(cola.confirmar(7));
}

void test_capacidad_descarta_el_mas_viejo() {
  ColaSalida cola(3);
  for (int i = 0; i < 5; i++) cola.agregar("t", std::to_string(i));
  TEST_ASSERT_EQUAL(3, cola.tamano());
  TEST_ASSERT_EQUAL(2, cola.descartados());
  TEST_ASSERT_EQUAL_STRING("2", cola.siguientePendiente()->payload.c_str());
}

void test_rechaza_textos_que_rompen_el_archivo() {
  ColaSalida cola(3);
  TEST_ASSERT_EQUAL(0, cola.agregar("t", "a\nb"));
  TEST_ASSERT_EQUAL(0, cola.agregar("t\tx", "a"));
  TEST_ASSERT_EQUAL(0, cola.agregar("", "a"));
  TEST_ASSERT_TRUE(cola.vacia());
  TEST_ASSERT_FALSE(cola.marcarEnVuelo(1, 0));
}

void test_serializar_y_recuperar_tras_reinicio() {
  ColaSalida cola(10);
  cola.agregar("feeder/A/visit", R"({"eventId":"x","class":"Gato"})");
  uint32_t b = cola.agregar("feeder/A/cmd/result", R"({"id":15,"ok":true})");
  cola.marcarEnVuelo(b, 3);  // lo que está en vuelo también se guarda
  std::string archivo = cola.serializar();

  ColaSalida recuperada(10);
  TEST_ASSERT_EQUAL(2, recuperada.deserializar(archivo));
  TEST_ASSERT_EQUAL(0, recuperada.enVuelo());
  const MensajeSalida* m = recuperada.siguientePendiente();
  TEST_ASSERT_EQUAL_STRING("feeder/A/visit", m->tema.c_str());
  TEST_ASSERT_EQUAL_STRING(R"({"eventId":"x","class":"Gato"})", m->payload.c_str());
  TEST_ASSERT_EQUAL(archivo.size(), recuperada.serializar().size());
}

void test_deserializar_ignora_basura_y_linea_cortada() {
  ColaSalida cola(10);
  std::string archivo = "feeder/A/visit\t{\"a\":1}\nsin tabulador\n\t{\"b\":2}\nfeeder/A/event\t{\"c\":3}\nfeeder/A/vi";
  TEST_ASSERT_EQUAL(2, cola.deserializar(archivo));
  TEST_ASSERT_EQUAL_STRING("{\"a\":1}", cola.siguientePendiente()->payload.c_str());
  TEST_ASSERT_EQUAL(0, cola.deserializar(""));
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_orden_y_confirmacion_por_puback);
  RUN_TEST(test_desconexion_reenvia_lo_que_estaba_en_vuelo);
  RUN_TEST(test_capacidad_descarta_el_mas_viejo);
  RUN_TEST(test_rechaza_textos_que_rompen_el_archivo);
  RUN_TEST(test_serializar_y_recuperar_tras_reinicio);
  RUN_TEST(test_deserializar_ignora_basura_y_linea_cortada);
  return UNITY_END();
}
