#include <ArduinoJson.h>
#include <math.h>
#include <string.h>
#include <unity.h>

#include "logica/protocolo.h"

using namespace logica;

namespace {

const char* CONFIG_OK = R"({
  "feederId": "ALIM-001", "version": 7, "minIntervalHours": 4, "timeZone": "America/Mexico_City",
  "pets": [
    { "id": 3, "name": "Firulais", "species": "Perro", "hopper": 1, "rfid": "0A00B1C2D3", "gramsPerMeal": 150.5 },
    { "id": 4, "name": "Michi", "species": "Gato", "hopper": 2, "rfid": null, "gramsPerMeal": 40 }
  ],
  "schedules": [ { "petId": 3, "time": "08:00" }, { "petId": null, "time": "19:30" } ]
})";

ErrorConfig parsear(const char* json, ConfigAlimentador& cfg) {
  return parsearConfig(json, strlen(json), "ALIM-001", cfg);
}

ErrorComando comando(const char* json, Comando& cmd, long& id) {
  return parsearComando(json, strlen(json), cmd, id);
}

}  // namespace

void setUp() {}
void tearDown() {}

void test_parsea_config_completa() {
  ConfigAlimentador cfg;
  TEST_ASSERT_EQUAL(ErrorConfig::Ok, parsear(CONFIG_OK, cfg));
  TEST_ASSERT_TRUE(cfg.valida());
  TEST_ASSERT_EQUAL(7, cfg.version);
  TEST_ASSERT_EQUAL(4, cfg.minIntervalHours);
  TEST_ASSERT_EQUAL_STRING("America/Mexico_City", cfg.zonaHoraria.c_str());
  TEST_ASSERT_EQUAL(2, cfg.mascotas.size());
  TEST_ASSERT_EQUAL_STRING("Firulais", cfg.mascotas[0].nombre.c_str());
  TEST_ASSERT_EQUAL(Clase::Perro, cfg.mascotas[0].especie);
  TEST_ASSERT_EQUAL_STRING("0A00B1C2D3", cfg.mascotas[0].rfid.c_str());
  TEST_ASSERT_EQUAL_DOUBLE(150.5, cfg.mascotas[0].gramosPorComida);
  TEST_ASSERT_EQUAL(Clase::Gato, cfg.mascotas[1].especie);
  TEST_ASSERT_TRUE(cfg.mascotas[1].rfid.empty());
  TEST_ASSERT_EQUAL(2, cfg.horarios.size());
  TEST_ASSERT_EQUAL(3, cfg.horarios[0].petId);
  TEST_ASSERT_EQUAL(8 * 60, cfg.horarios[0].minutoDelDia);
  TEST_ASSERT_EQUAL(SIN_MASCOTA, cfg.horarios[1].petId);
  TEST_ASSERT_EQUAL(19 * 60 + 30, cfg.horarios[1].minutoDelDia);
  TEST_ASSERT_NOT_NULL(cfg.buscarMascota(4));
  TEST_ASSERT_NULL(cfg.buscarMascota(99));
}

void test_config_minima_sin_mascotas() {
  ConfigAlimentador cfg;
  const char* json = R"({"feederId":"ALIM-001","version":0,"pets":[],"schedules":[]})";
  TEST_ASSERT_EQUAL(ErrorConfig::Ok, parsear(json, cfg));
  TEST_ASSERT_EQUAL(0, cfg.version);
  TEST_ASSERT_EQUAL(0, cfg.minIntervalHours);
  TEST_ASSERT_EQUAL_STRING("America/Mexico_City", cfg.zonaHoraria.c_str());
}

void test_config_de_otro_alimentador_se_rechaza() {
  ConfigAlimentador cfg;
  const char* json = R"({"feederId":"ALIM-002","version":1,"pets":[],"schedules":[]})";
  TEST_ASSERT_EQUAL(ErrorConfig::FeederIncorrecto, parsear(json, cfg));
  TEST_ASSERT_FALSE(cfg.valida());
}

void test_config_invalida_no_modifica_la_anterior() {
  ConfigAlimentador cfg;
  TEST_ASSERT_EQUAL(ErrorConfig::Ok, parsear(CONFIG_OK, cfg));
  const char* casos[] = {
      "no es json",
      R"({"version":1})",
      R"({"feederId":"ALIM-001"})",
      R"({"feederId":"ALIM-001","version":1,"minIntervalHours":-1})",
      R"({"feederId":"ALIM-001","version":1,"pets":[{"id":1,"species":"Paloma","hopper":1,"gramsPerMeal":10}]})",
      R"({"feederId":"ALIM-001","version":1,"pets":[{"id":1,"species":"Perro","hopper":2,"gramsPerMeal":10}]})",
      R"({"feederId":"ALIM-001","version":1,"pets":[{"id":1,"species":"Gato","hopper":2,"gramsPerMeal":0}]})",
      R"({"feederId":"ALIM-001","version":1,"pets":[{"id":1,"species":"Gato","hopper":2,"gramsPerMeal":9999}]})",
      R"({"feederId":"ALIM-001","version":1,"pets":[{"id":1,"species":"Gato","hopper":2,"gramsPerMeal":10},{"id":1,"species":"Gato","hopper":2,"gramsPerMeal":10}]})",
      R"({"feederId":"ALIM-001","version":1,"pets":[],"schedules":[{"petId":5,"time":"08:00"}]})",
      R"({"feederId":"ALIM-001","version":1,"pets":[],"schedules":[{"petId":null,"time":"24:00"}]})",
      R"({"feederId":"ALIM-001","version":1,"pets":[],"schedules":[{"petId":null,"time":"8:00"}]})",
  };
  for (const char* caso : casos) {
    TEST_ASSERT_NOT_EQUAL_MESSAGE(ErrorConfig::Ok, parsear(caso, cfg), caso);
  }
  TEST_ASSERT_EQUAL(7, cfg.version);
  TEST_ASSERT_EQUAL(2, cfg.mascotas.size());
}

void test_parsear_hora() {
  int m = -1;
  TEST_ASSERT_TRUE(parsearHora("00:00", m));
  TEST_ASSERT_EQUAL(0, m);
  TEST_ASSERT_TRUE(parsearHora("23:59", m));
  TEST_ASSERT_EQUAL(1439, m);
  TEST_ASSERT_FALSE(parsearHora("23:60", m));
  TEST_ASSERT_FALSE(parsearHora("7:00", m));
  TEST_ASSERT_FALSE(parsearHora("07-00", m));
  TEST_ASSERT_FALSE(parsearHora(nullptr, m));
}

void test_comando_dispensar_completo() {
  Comando cmd;
  long id = 0;
  TEST_ASSERT_EQUAL(ErrorComando::Ok,
                    comando(R"({"id":15,"type":"dispense","grams":30.0,"petId":3,"hopper":2})", cmd, id));
  TEST_ASSERT_EQUAL(15, id);
  TEST_ASSERT_EQUAL(TipoComando::Dispensar, cmd.tipo);
  TEST_ASSERT_TRUE(cmd.tieneGramos);
  TEST_ASSERT_EQUAL_DOUBLE(30.0, cmd.gramos);
  TEST_ASSERT_EQUAL(3, cmd.petId);
  TEST_ASSERT_EQUAL(2, cmd.tolva);
}

void test_comando_dispensar_invalidos_conservan_id() {
  Comando cmd;
  long id = 0;
  TEST_ASSERT_EQUAL(ErrorComando::GramosInvalidos,
                    comando(R"({"id":20,"type":"dispense","grams":0,"hopper":1})", cmd, id));
  TEST_ASSERT_EQUAL(20, id);
  TEST_ASSERT_EQUAL(ErrorComando::GramosInvalidos,
                    comando(R"({"id":21,"type":"dispense","grams":401,"hopper":1})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::GramosInvalidos,
                    comando(R"({"id":21,"type":"dispense","grams":"30","hopper":1})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::TolvaInvalida,
                    comando(R"({"id":22,"type":"dispense","grams":10,"hopper":3})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::FaltaDestino,
                    comando(R"({"id":23,"type":"dispense","grams":10})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::TipoDesconocido, comando(R"({"id":24,"type":"reboot"})", cmd, id));
  TEST_ASSERT_EQUAL(24, id);
  TEST_ASSERT_EQUAL(ErrorComando::SinId, comando(R"({"type":"dispense"})", cmd, id));
  TEST_ASSERT_EQUAL(0, id);
  TEST_ASSERT_EQUAL(ErrorComando::JsonInvalido, comando("{", cmd, id));
}

void test_comando_ota() {
  Comando cmd;
  long id = 0;
  const char* json =
      R"({"id":16,"type":"ota","target":"firmware","url":"http://192.168.1.50:8080/ota/fw-1.3.0.bin",)"
      R"("sha256":"ABCDEF0123456789abcdef0123456789ABCDEF0123456789abcdef0123456789","version":"1.3.0"})";
  TEST_ASSERT_EQUAL(ErrorComando::Ok, comando(json, cmd, id));
  TEST_ASSERT_EQUAL(TipoComando::Ota, cmd.tipo);
  TEST_ASSERT_EQUAL(ObjetivoOta::Firmware, cmd.objetivo);
  TEST_ASSERT_EQUAL_STRING("http://192.168.1.50:8080/ota/fw-1.3.0.bin", cmd.url.c_str());
  TEST_ASSERT_EQUAL_STRING("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
                           cmd.sha256.c_str());
  TEST_ASSERT_EQUAL_STRING("1.3.0", cmd.version.c_str());

  TEST_ASSERT_EQUAL(ErrorComando::Ok,
                    comando(R"({"id":17,"type":"ota","target":"model","url":"http://pi/ota/m.tflite",)"
                            R"("sha256":"0000000000000000000000000000000000000000000000000000000000000000"})",
                            cmd, id));
  TEST_ASSERT_EQUAL(ObjetivoOta::Modelo, cmd.objetivo);
  TEST_ASSERT_TRUE(cmd.version.empty());
}

void test_comando_ota_invalido() {
  Comando cmd;
  long id = 0;
  const char* sha = "0000000000000000000000000000000000000000000000000000000000000000";
  char json[256];
  snprintf(json, sizeof(json), R"({"id":1,"type":"ota","target":"bootloader","url":"http://pi/x","sha256":"%s"})", sha);
  TEST_ASSERT_EQUAL(ErrorComando::ObjetivoInvalido, comando(json, cmd, id));
  snprintf(json, sizeof(json), R"({"id":1,"type":"ota","target":"firmware","url":"ftp://pi/x","sha256":"%s"})", sha);
  TEST_ASSERT_EQUAL(ErrorComando::UrlInvalida, comando(json, cmd, id));
  snprintf(json, sizeof(json), R"({"id":1,"type":"ota","target":"firmware","url":"http://","sha256":"%s"})", sha);
  TEST_ASSERT_EQUAL(ErrorComando::UrlInvalida, comando(json, cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::Sha256Invalido,
                    comando(R"({"id":1,"type":"ota","target":"firmware","url":"http://pi/x","sha256":"abc"})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::Sha256Invalido,
                    comando(R"({"id":1,"type":"ota","target":"firmware","url":"http://pi/x",)"
                            R"("sha256":"zz00000000000000000000000000000000000000000000000000000000000000"})",
                            cmd, id));
}

void test_resolver_dispensado_con_config() {
  ConfigAlimentador cfg;
  TEST_ASSERT_EQUAL(ErrorConfig::Ok, parsear(CONFIG_OK, cfg));
  Comando cmd;
  long id;
  int tolva = 0;
  double gramos = 0;

  // Solo la mascota: tolva y ración salen de la config.
  TEST_ASSERT_EQUAL(ErrorComando::Ok, comando(R"({"id":1,"type":"dispense","grams":null,"petId":4})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::Ok, resolverDispensado(cmd, cfg, tolva, gramos));
  TEST_ASSERT_EQUAL(2, tolva);
  TEST_ASSERT_EQUAL_DOUBLE(40.0, gramos);

  // Gramos explícitos ganan a la ración.
  TEST_ASSERT_EQUAL(ErrorComando::Ok, comando(R"({"id":1,"type":"dispense","grams":12.5,"petId":3})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::Ok, resolverDispensado(cmd, cfg, tolva, gramos));
  TEST_ASSERT_EQUAL(1, tolva);
  TEST_ASSERT_EQUAL_DOUBLE(12.5, gramos);

  // Tolva que no coincide con la mascota.
  TEST_ASSERT_EQUAL(ErrorComando::Ok, comando(R"({"id":1,"type":"dispense","grams":10,"petId":3,"hopper":2})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::TolvaInvalida, resolverDispensado(cmd, cfg, tolva, gramos));

  // Solo tolva sin gramos: no se sabe cuánto.
  TEST_ASSERT_EQUAL(ErrorComando::Ok, comando(R"({"id":1,"type":"dispense","hopper":1})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::GramosInvalidos, resolverDispensado(cmd, cfg, tolva, gramos));

  // Mascota que no está en la config (pero con tolva y gramos se puede dispensar).
  TEST_ASSERT_EQUAL(ErrorComando::Ok, comando(R"({"id":1,"type":"dispense","petId":99})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::MascotaDesconocida, resolverDispensado(cmd, cfg, tolva, gramos));
  TEST_ASSERT_EQUAL(ErrorComando::Ok, comando(R"({"id":1,"type":"dispense","petId":99,"hopper":2,"grams":5})", cmd, id));
  TEST_ASSERT_EQUAL(ErrorComando::Ok, resolverDispensado(cmd, cfg, tolva, gramos));
  TEST_ASSERT_EQUAL(2, tolva);
}

void test_hora_gateway() {
  int64_t ahora = 0;
  TEST_ASSERT_TRUE(parsearHoraGateway(R"({"now":1794350000})", 19, ahora));
  TEST_ASSERT_EQUAL_INT64(1794350000LL, ahora);
  TEST_ASSERT_FALSE(parsearHoraGateway(R"({"now":"x"})", 12, ahora));
  TEST_ASSERT_FALSE(parsearHoraGateway(R"({})", 2, ahora));
}

void test_json_estado_con_nulos() {
  Estado e{72.04, NAN, 3.14, 0.0, "1.2.0", "", 1794350000};
  std::string json = jsonEstado(e);
  JsonDocument doc;
  TEST_ASSERT_FALSE(deserializeJson(doc, json));
  TEST_ASSERT_TRUE(doc["online"].as<bool>());
  TEST_ASSERT_DOUBLE_WITHIN(1e-4, 72.0, doc["hopperDogPct"].as<double>());
  TEST_ASSERT_TRUE(doc["hopperCatPct"].isNull());
  TEST_ASSERT_DOUBLE_WITHIN(1e-4, 3.1, doc["plateDogG"].as<double>());
  TEST_ASSERT_EQUAL_STRING("1.2.0", doc["firmware"]);
  TEST_ASSERT_TRUE(doc["model"].isNull());
  TEST_ASSERT_EQUAL_INT64(1794350000LL, doc["reportedAt"].as<int64_t>());
  TEST_ASSERT_EQUAL_STRING("{\"online\":false}", jsonEstadoDesconectado().c_str());
}

void test_json_visita_evento_resultado() {
  Visita v;
  v.eventId = "e1";
  v.clase = Clase::Gato;
  v.confianza = 0.93456;
  v.startedAt = 100;
  v.endedAt = 160;
  v.plateBeforeG = 3.14;
  v.dispensedG = 31.25;
  v.plateAfterG = 5.0;
  TEST_ASSERT_EQUAL_STRING(
      R"({"eventId":"e1","petId":null,"class":"Gato","confidence":0.935,"startedAt":100,"endedAt":160,)"
      R"("plateBeforeG":3.1,"dispensedG":31.3,"plateAfterG":5})",
      jsonVisita(v).c_str());
  v.petId = 3;
  TEST_ASSERT_TRUE(jsonVisita(v).find("\"petId\":3") != std::string::npos);

  Evento e;
  e.eventId = "e2";
  e.tipo = TipoEvento::TolvaBaja;
  e.occurredAt = 200;
  e.tolva = 2;
  TEST_ASSERT_EQUAL_STRING(R"({"eventId":"e2","type":"HOPPER_LOW","occurredAt":200,"detail":null,"hopper":2})",
                           jsonEvento(e).c_str());
  e.tipo = TipoEvento::Atasco;
  e.detalle = "sin flujo";
  TEST_ASSERT_TRUE(jsonEvento(e).find(R"("type":"JAM")") != std::string::npos);
  TEST_ASSERT_TRUE(jsonEvento(e).find(R"("detail":"sin flujo")") != std::string::npos);

  TEST_ASSERT_EQUAL_STRING(R"({"id":15,"ok":true,"dispensedG":29.8,"error":null})",
                           jsonResultado(15, true, 29.84, "").c_str());
  TEST_ASSERT_EQUAL_STRING(R"({"id":16,"ok":false,"dispensedG":null,"error":"sha256 no coincide"})",
                           jsonResultado(16, false, NAN, "sha256 no coincide").c_str());
}

void test_temas_e_ids() {
  TEST_ASSERT_TRUE(feederIdValido("ALIM-001"));
  TEST_ASSERT_TRUE(feederIdValido("casa_2"));
  TEST_ASSERT_FALSE(feederIdValido(""));
  TEST_ASSERT_FALSE(feederIdValido("a/b"));
  TEST_ASSERT_FALSE(feederIdValido("a+"));
  TEST_ASSERT_FALSE(feederIdValido("con espacio"));
  TEST_ASSERT_EQUAL_STRING("feeder/ALIM-001/cmd/result", tema("ALIM-001", "cmd/result").c_str());
}

void test_utilidades() {
  const uint8_t bytes[] = {0x00, 0xAB, 0x7F};
  TEST_ASSERT_EQUAL_STRING("00ab7f", bytesAHex(bytes, 3).c_str());
  Clase c;
  TEST_ASSERT_TRUE(claseDesdeTexto("Nada", c));
  TEST_ASSERT_EQUAL(Clase::Nada, c);
  TEST_ASSERT_FALSE(claseDesdeTexto("Paloma", c));
  TEST_ASSERT_FALSE(claseDesdeTexto("perro", c));
  TEST_ASSERT_EQUAL(0, tolvaDeClase(Clase::Nada));
  TEST_ASSERT_EQUAL_DOUBLE(3.1, redondear(3.14, 1));
  TEST_ASSERT_EQUAL_DOUBLE(0.935, redondear(0.93456, 3));
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_parsea_config_completa);
  RUN_TEST(test_config_minima_sin_mascotas);
  RUN_TEST(test_config_de_otro_alimentador_se_rechaza);
  RUN_TEST(test_config_invalida_no_modifica_la_anterior);
  RUN_TEST(test_parsear_hora);
  RUN_TEST(test_comando_dispensar_completo);
  RUN_TEST(test_comando_dispensar_invalidos_conservan_id);
  RUN_TEST(test_comando_ota);
  RUN_TEST(test_comando_ota_invalido);
  RUN_TEST(test_resolver_dispensado_con_config);
  RUN_TEST(test_hora_gateway);
  RUN_TEST(test_json_estado_con_nulos);
  RUN_TEST(test_json_visita_evento_resultado);
  RUN_TEST(test_temas_e_ids);
  RUN_TEST(test_utilidades);
  return UNITY_END();
}
