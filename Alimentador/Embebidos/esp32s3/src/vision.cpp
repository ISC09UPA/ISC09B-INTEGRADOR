#include "vision.h"

#include <Arduino.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <WiFi.h>
#include <esp_camera.h>
#include <esp_heap_caps.h>
#include <img_converters.h>

// TensorFlow Lite Micro (biblioteca TensorFlowLite_ESP32)
#include <TensorFlowLite_ESP32.h>
#include "tensorflow/lite/micro/micro_error_reporter.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/schema/schema_generated.h"

#include <new>

#include "almacenamiento.h"
#include "config.h"
#include "credenciales.h"

namespace vision {

namespace {

constexpr int ANCHO_FOTO = 320;  // FRAMESIZE_QVGA
constexpr int ALTO_FOTO = 240;

bool camaraLista = false;

uint8_t* modeloBytes = nullptr;
uint8_t* arena = nullptr;
uint8_t* rgb = nullptr;      // foto decodificada (PSRAM)
uint8_t* entrada = nullptr;  // foto recortada al tamaño del modelo
tflite::MicroInterpreter* interprete = nullptr;
alignas(tflite::MicroInterpreter) uint8_t memoriaInterprete[sizeof(tflite::MicroInterpreter)];
tflite::MicroErrorReporter reportero;
tflite::MicroMutableOpResolver<24> resolvedor;
bool resolvedorListo = false;
std::string version;

void registrarOperaciones() {
  if (resolvedorListo) return;
  // Operaciones de las redes de clasificación comunes (MobileNet, EfficientNet-Lite, CNN chica).
  resolvedor.AddConv2D();
  resolvedor.AddDepthwiseConv2D();
  resolvedor.AddFullyConnected();
  resolvedor.AddAveragePool2D();
  resolvedor.AddMaxPool2D();
  resolvedor.AddMean();
  resolvedor.AddReshape();
  resolvedor.AddSoftmax();
  resolvedor.AddLogistic();
  resolvedor.AddRelu();
  resolvedor.AddRelu6();
  resolvedor.AddHardSwish();
  resolvedor.AddAdd();
  resolvedor.AddMul();
  resolvedor.AddPad();
  resolvedor.AddQuantize();
  resolvedor.AddDequantize();
  resolvedor.AddConcatenation();
  resolvedor.AddStridedSlice();
  resolvedor.AddSqueeze();
  resolvedor.AddShape();
  resolvedor.AddPack();
  resolvedorListo = true;
}

void* psram(size_t bytes) {
  void* p = heap_caps_malloc(bytes, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  return p ? p : malloc(bytes);
}

std::string urlEncode(const std::string& texto) {
  static const char HEX_DIG[] = "0123456789ABCDEF";
  std::string salida;
  for (unsigned char c : texto) {
    if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
      salida += static_cast<char>(c);
    } else {
      salida += '%';
      salida += HEX_DIG[c >> 4];
      salida += HEX_DIG[c & 0x0F];
    }
  }
  return salida;
}

// Llena el tensor de entrada con la foto ya escalada (RGB888 en `entrada`).
bool llenarEntrada(TfLiteTensor* t, int ancho, int alto, int canales) {
  const size_t pixeles = static_cast<size_t>(ancho) * alto;
  const float rango = MODELO_ENTRADA_MAX - MODELO_ENTRADA_MIN;
  for (size_t i = 0; i < pixeles; i++) {
    const uint8_t* p = entrada + i * 3;
    for (int c = 0; c < canales; c++) {
      uint8_t v = canales == 1 ? static_cast<uint8_t>((p[0] + p[1] + p[2]) / 3) : p[c];
      float x = MODELO_ENTRADA_MIN + rango * v / 255.0f;
      size_t k = i * canales + c;
      switch (t->type) {
        case kTfLiteInt8:
          t->data.int8[k] = static_cast<int8_t>(
              logica::cuantizar(x, t->params.scale, t->params.zero_point, -128, 127));
          break;
        case kTfLiteUInt8:
          t->data.uint8[k] = static_cast<uint8_t>(
              logica::cuantizar(x, t->params.scale, t->params.zero_point, 0, 255));
          break;
        case kTfLiteFloat32:
          t->data.f[k] = x;
          break;
        default:
          return false;
      }
    }
  }
  return true;
}

bool leerSalida(const TfLiteTensor* t, float* probabilidades) {
  for (size_t i = 0; i < logica::NUM_CLASES; i++) {
    switch (t->type) {
      case kTfLiteInt8:
        probabilidades[i] = (t->data.int8[i] - t->params.zero_point) * t->params.scale;
        break;
      case kTfLiteUInt8:
        probabilidades[i] = (t->data.uint8[i] - t->params.zero_point) * t->params.scale;
        break;
      case kTfLiteFloat32:
        probabilidades[i] = t->data.f[i];
        break;
      default:
        return false;
    }
  }
  logica::normalizarProbabilidades(probabilidades, logica::NUM_CLASES);
  return true;
}

// Clasifica un JPEG; deja las probabilidades en `probabilidades`.
bool clasificarJpeg(const uint8_t* jpeg, size_t largo, float* probabilidades) {
  TfLiteTensor* t = interprete->input(0);
  if (t->dims->size != 4) return false;
  int alto = t->dims->data[1];
  int ancho = t->dims->data[2];
  int canales = t->dims->data[3];
  if (canales != 1 && canales != 3) return false;

  if (!fmt2rgb888(jpeg, largo, PIXFORMAT_JPEG, rgb)) return false;
  logica::recortarYEscalarRgb(rgb, ANCHO_FOTO, ALTO_FOTO, entrada, ancho, alto);
  // El decodificador de esp32-camera entrega BGR: se pasa a RGB.
  for (size_t i = 0; i < static_cast<size_t>(ancho) * alto; i++) {
    std::swap(entrada[i * 3], entrada[i * 3 + 2]);
  }
  if (!llenarEntrada(t, ancho, alto, canales)) return false;
  if (interprete->Invoke() != kTfLiteOk) return false;
  return leerSalida(interprete->output(0), probabilidades);
}

}  // namespace

bool iniciarCamara() {
  camera_config_t c = {};
  c.pin_pwdn = CAM_PIN_PWDN;
  c.pin_reset = CAM_PIN_RESET;
  c.pin_xclk = CAM_PIN_XCLK;
  c.pin_sccb_sda = CAM_PIN_SIOD;
  c.pin_sccb_scl = CAM_PIN_SIOC;
  c.pin_d7 = CAM_PIN_D7;
  c.pin_d6 = CAM_PIN_D6;
  c.pin_d5 = CAM_PIN_D5;
  c.pin_d4 = CAM_PIN_D4;
  c.pin_d3 = CAM_PIN_D3;
  c.pin_d2 = CAM_PIN_D2;
  c.pin_d1 = CAM_PIN_D1;
  c.pin_d0 = CAM_PIN_D0;
  c.pin_vsync = CAM_PIN_VSYNC;
  c.pin_href = CAM_PIN_HREF;
  c.pin_pclk = CAM_PIN_PCLK;
  c.xclk_freq_hz = 20000000;
  c.ledc_timer = LEDC_TIMER_0;
  c.ledc_channel = LEDC_CHANNEL_0;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = FRAMESIZE_QVGA;
  c.jpeg_quality = CAMARA_CALIDAD_JPEG;
  c.fb_count = 2;
  c.fb_location = CAMERA_FB_IN_PSRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;  // siempre la foto más reciente

  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) {
    log_e("No inicia la camara: 0x%x", err);
    return false;
  }
  rgb = static_cast<uint8_t*>(psram(ANCHO_FOTO * ALTO_FOTO * 3));
  camaraLista = rgb != nullptr;
  return camaraLista;
}

bool cargarModelo() {
  liberarModelo();
  File f = LittleFS.open(RUTA_MODELO, "r");
  if (!f) {
    log_w("No hay %s: se sube cada foto a la Pi como dudosa", RUTA_MODELO);
    return false;
  }
  size_t largo = f.size();
  modeloBytes = static_cast<uint8_t*>(psram(largo));
  if (!modeloBytes || f.read(modeloBytes, largo) != largo) {
    f.close();
    log_e("No se pudo leer el modelo (%u bytes)", (unsigned)largo);
    liberarModelo();
    return false;
  }
  f.close();

  const tflite::Model* modelo = tflite::GetModel(modeloBytes);
  if (modelo->version() != TFLITE_SCHEMA_VERSION) {
    log_e("Modelo con esquema %u, se esperaba %d", (unsigned)modelo->version(),
          TFLITE_SCHEMA_VERSION);
    liberarModelo();
    return false;
  }

  arena = static_cast<uint8_t*>(psram(TFLITE_ARENA_BYTES));
  if (!arena) {
    liberarModelo();
    return false;
  }
  registrarOperaciones();
  interprete = new (memoriaInterprete)
      tflite::MicroInterpreter(modelo, resolvedor, arena, TFLITE_ARENA_BYTES, &reportero);
  if (interprete->AllocateTensors() != kTfLiteOk) {
    log_e("AllocateTensors fallo: arena chica u operacion no registrada");
    liberarModelo();
    return false;
  }

  TfLiteTensor* in = interprete->input(0);
  TfLiteTensor* out = interprete->output(0);
  size_t salidas = 1;
  for (int i = 0; i < out->dims->size; i++) salidas *= out->dims->data[i];
  if (in->dims->size != 4 || salidas != logica::NUM_CLASES) {
    log_e("El modelo debe tener entrada [1,alto,ancho,canales] y %u salidas",
          (unsigned)logica::NUM_CLASES);
    liberarModelo();
    return false;
  }
  entrada = static_cast<uint8_t*>(psram(in->dims->data[1] * in->dims->data[2] * 3));
  if (!entrada) {
    liberarModelo();
    return false;
  }

  version.clear();
  almacenamiento::leer(RUTA_MODELO_VERSION, version);
  while (!version.empty() && isspace(static_cast<unsigned char>(version.back()))) version.pop_back();
  if (version.empty()) version = "sin-version";
  log_i("Modelo %s cargado: entrada %dx%dx%d, arena usada %u bytes", version.c_str(),
        in->dims->data[1], in->dims->data[2], in->dims->data[3],
        (unsigned)interprete->arena_used_bytes());
  return true;
}

void liberarModelo() {
  if (interprete) {
    interprete->~MicroInterpreter();
    interprete = nullptr;
  }
  free(arena);
  arena = nullptr;
  free(modeloBytes);
  modeloBytes = nullptr;
  free(entrada);
  entrada = nullptr;
  version.clear();
}

bool modeloCargado() { return interprete != nullptr; }

std::string versionModelo() { return version; }

bool reconocer(uint8_t fotos, Captura& salida) {
  salida = Captura{};
  if (!camaraLista) return false;

  logica::CombinadorFotos combinador;
  float mejorConfianza = -1;
  for (uint8_t i = 0; i < fotos; i++) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) continue;
    float probabilidades[logica::NUM_CLASES];
    bool ok = modeloCargado() && clasificarJpeg(fb->buf, fb->len, probabilidades);
    float confianza = -0.5f;
    if (ok) {
      combinador.agregar(probabilidades, logica::NUM_CLASES);
      confianza = logica::elegirClase(probabilidades, logica::NUM_CLASES).confianza;
    }
    if (confianza > mejorConfianza) {
      mejorConfianza = confianza;
      salida.jpeg.assign(fb->buf, fb->buf + fb->len);
    }
    esp_camera_fb_return(fb);
  }
  salida.tomadaEn = static_cast<int64_t>(time(nullptr));
  if (combinador.fotos() == 0) return false;
  salida.resultado = combinador.resultado();
  return true;
}

bool subirFoto(const Captura& captura, const std::string& eventId) {
  if (captura.jpeg.empty() || WiFi.status() != WL_CONNECTED) return false;
  char confianza[16];
  snprintf(confianza, sizeof(confianza), "%.3f", captura.resultado.confianza);
  std::string url = std::string("http://") + GATEWAY_HOST + ":" + std::to_string(GATEWAY_HTTP_PORT) +
                    "/photos?feederId=" + urlEncode(FEEDER_ID) + "&eventId=" + urlEncode(eventId) +
                    "&class=" + logica::nombreClase(captura.resultado.clase) +
                    "&confidence=" + confianza + "&takenAt=" + std::to_string(captura.tomadaEn);

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(url.c_str())) return false;
  http.addHeader("Content-Type", "image/jpeg");
  int codigo = http.POST(const_cast<uint8_t*>(captura.jpeg.data()), captura.jpeg.size());
  http.end();
  if (codigo < 200 || codigo >= 300) {
    log_w("La Pi no acepto la foto: HTTP %d", codigo);
    return false;
  }
  log_i("Foto dudosa subida (%u bytes)", (unsigned)captura.jpeg.size());
  return true;
}

}  // namespace vision
