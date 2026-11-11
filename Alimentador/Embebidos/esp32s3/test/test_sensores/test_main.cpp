#include <math.h>
#include <string.h>
#include <unity.h>

#include "logica/clasificador.h"
#include "logica/sensores.h"

using namespace logica;

void setUp() {}
void tearDown() {}

void test_porcentaje_tolva() {
  TEST_ASSERT_EQUAL_DOUBLE(0.0, porcentajeTolva(30, 30, 4));
  TEST_ASSERT_EQUAL_DOUBLE(100.0, porcentajeTolva(4, 30, 4));
  TEST_ASSERT_EQUAL_DOUBLE(50.0, porcentajeTolva(17, 30, 4));
  TEST_ASSERT_EQUAL_DOUBLE(100.0, porcentajeTolva(2.5, 30, 4));
  TEST_ASSERT_EQUAL_DOUBLE(0.0, porcentajeTolva(40, 30, 4));
  TEST_ASSERT_TRUE(isnan(porcentajeTolva(NAN, 30, 4)));
  TEST_ASSERT_TRUE(isnan(porcentajeTolva(10, 4, 30)));  // calibración invertida
}

void test_mediana_ignora_lecturas_perdidas() {
  double a[] = {10, NAN, 30, 12, 11};
  TEST_ASSERT_EQUAL_DOUBLE(11.5, mediana(a, 5));
  double b[] = {5, 1, 3};
  TEST_ASSERT_EQUAL_DOUBLE(3.0, mediana(b, 3));
  double c[] = {NAN, NAN};
  TEST_ASSERT_TRUE(isnan(mediana(c, 2)));
}

void test_eco_a_distancia() {
  TEST_ASSERT_DOUBLE_WITHIN(0.01, 10.0, distanciaDesdeEcoUs(580));
  TEST_ASSERT_TRUE(isnan(distanciaDesdeEcoUs(0)));
  TEST_ASSERT_TRUE(isnan(distanciaDesdeEcoUs(50)));
  TEST_ASSERT_TRUE(isnan(distanciaDesdeEcoUs(30000)));
}

void test_alarma_tolva_baja_con_histeresis() {
  AlarmaNivel a(15, 25);
  TEST_ASSERT_FALSE(a.actualizar(40));
  TEST_ASSERT_TRUE(a.actualizar(14));   // cruza: un solo evento
  TEST_ASSERT_FALSE(a.actualizar(10));
  TEST_ASSERT_FALSE(a.actualizar(18));  // ruido cerca del umbral no repite
  TEST_ASSERT_FALSE(a.actualizar(14));
  TEST_ASSERT_FALSE(a.actualizar(NAN));
  TEST_ASSERT_TRUE(a.baja());
  TEST_ASSERT_FALSE(a.actualizar(80));  // rellenaron
  TEST_ASSERT_FALSE(a.baja());
  TEST_ASSERT_TRUE(a.actualizar(5));
}

void test_cambio_relevante() {
  TEST_ASSERT_TRUE(cambioRelevante(50, 44, 5));
  TEST_ASSERT_FALSE(cambioRelevante(50, 46, 5));
  TEST_ASSERT_TRUE(cambioRelevante(NAN, 46, 5));
  TEST_ASSERT_TRUE(cambioRelevante(46, NAN, 5));
  TEST_ASSERT_FALSE(cambioRelevante(NAN, NAN, 5));
}

namespace {
bool alimentarTexto(LectorRdm6300& lector, const char* texto, bool conMarcas = true) {
  bool listo = false;
  if (conMarcas) listo |= lector.alimentar(0x02);
  for (const char* p = texto; *p; p++) listo |= lector.alimentar(static_cast<uint8_t>(*p));
  if (conMarcas) listo |= lector.alimentar(0x03);
  return listo;
}
}  // namespace

void test_rfid_rdm6300() {
  LectorRdm6300 lector;
  // 0A ^ 00 ^ B1 ^ C2 ^ D3 = 0xAA
  TEST_ASSERT_TRUE(alimentarTexto(lector, "0a00b1c2d3AA"));
  TEST_ASSERT_EQUAL_STRING("0A00B1C2D3", lector.etiqueta());
  TEST_ASSERT_FALSE(alimentarTexto(lector, "0A00B1C2D3AB"));  // checksum malo
  TEST_ASSERT_FALSE(alimentarTexto(lector, "0A00B1C2D3"));    // corta
  TEST_ASSERT_FALSE(alimentarTexto(lector, "0A00B1C2D3AA00"));  // larga
  TEST_ASSERT_FALSE(alimentarTexto(lector, "0A00B1C2DZAA"));  // no hex
  TEST_ASSERT_FALSE(alimentarTexto(lector, "0A00B1C2D3AA", false));  // sin inicio
  // Basura antes del inicio de trama no afecta.
  lector.alimentar('x');
  TEST_ASSERT_TRUE(alimentarTexto(lector, "0A00B1C2D3AA"));
}

void test_probabilidades_y_clase() {
  float probs[] = {0.1f, 0.7f, 0.15f, 0.05f};
  normalizarProbabilidades(probs, 4);
  TEST_ASSERT_FLOAT_WITHIN(1e-6, 0.7f, probs[1]);  // ya eran probabilidades
  ResultadoClase r = elegirClase(probs, 4);
  TEST_ASSERT_EQUAL(Clase::Gato, r.clase);
  TEST_ASSERT_FLOAT_WITHIN(1e-6, 0.7f, r.confianza);
  TEST_ASSERT_TRUE(esDudosa(r, 0.75f));
  TEST_ASSERT_FALSE(esDudosa(r, 0.7f));

  float logits[] = {2.0f, 0.0f, -1.0f, 0.5f};
  normalizarProbabilidades(logits, 4);
  float suma = logits[0] + logits[1] + logits[2] + logits[3];
  TEST_ASSERT_FLOAT_WITHIN(1e-5, 1.0f, suma);
  TEST_ASSERT_EQUAL(Clase::Perro, elegirClase(logits, 4).clase);
}

void test_combinar_fotos() {
  CombinadorFotos c;
  TEST_ASSERT_EQUAL(Clase::Nada, c.resultado().clase);
  float a[] = {0.6f, 0.3f, 0.05f, 0.05f};
  float b[] = {0.2f, 0.7f, 0.05f, 0.05f};
  float d[] = {0.1f, 0.8f, 0.05f, 0.05f};
  c.agregar(a, 4);
  c.agregar(b, 4);
  c.agregar(d, 4);
  ResultadoClase r = c.resultado();
  TEST_ASSERT_EQUAL(Clase::Gato, r.clase);
  TEST_ASSERT_FLOAT_WITHIN(1e-5, 0.6f, r.confianza);
  c.reiniciar();
  TEST_ASSERT_EQUAL(0, c.fotos());
}

void test_recorte_y_escala() {
  // Imagen 4x2: el recorte central cuadrado son las columnas 1 y 2.
  uint8_t img[4 * 2 * 3];
  for (int i = 0; i < 8; i++) {
    img[i * 3] = static_cast<uint8_t>(i);
    img[i * 3 + 1] = 0;
    img[i * 3 + 2] = 0;
  }
  uint8_t salida[2 * 2 * 3];
  recortarYEscalarRgb(img, 4, 2, salida, 2, 2);
  TEST_ASSERT_EQUAL_UINT8(1, salida[0]);
  TEST_ASSERT_EQUAL_UINT8(2, salida[3]);
  TEST_ASSERT_EQUAL_UINT8(5, salida[6]);
  TEST_ASSERT_EQUAL_UINT8(6, salida[9]);
}

void test_cuantizar() {
  // int8 con escala 1/255 y punto cero -128 (entrada normalizada 0..1).
  TEST_ASSERT_EQUAL_INT32(-128, cuantizar(0.0f, 1.0f / 255, -128, -128, 127));
  TEST_ASSERT_EQUAL_INT32(127, cuantizar(1.0f, 1.0f / 255, -128, -128, 127));
  TEST_ASSERT_EQUAL_INT32(127, cuantizar(5.0f, 1.0f / 255, -128, -128, 127));
  TEST_ASSERT_EQUAL_INT32(0, cuantizar(128.0f, 1.0f, 0, 0, 255) - 128);
  TEST_ASSERT_EQUAL_INT32(7, cuantizar(1.0f, 0.0f, 7, -128, 127));
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_porcentaje_tolva);
  RUN_TEST(test_mediana_ignora_lecturas_perdidas);
  RUN_TEST(test_eco_a_distancia);
  RUN_TEST(test_alarma_tolva_baja_con_histeresis);
  RUN_TEST(test_cambio_relevante);
  RUN_TEST(test_rfid_rdm6300);
  RUN_TEST(test_probabilidades_y_clase);
  RUN_TEST(test_combinar_fotos);
  RUN_TEST(test_recorte_y_escala);
  RUN_TEST(test_cuantizar);
  return UNITY_END();
}
