// Configuración central del frontend. Es lo único que hay que tocar para conectar con el backend.
//
// USE_MOCK = true  -> la app funciona sola con datos de ejemplo (modo demo, sin backend).
// USE_MOCK = false -> la app consume la API real. Antes hay que poner BASE_URL y CAMERA_URL.

export const USE_MOCK = true;

// URL base de la API en Azure (sin diagonal al final). Ejemplo: https://almacen-api.azurewebsites.net/api
export const BASE_URL = 'https://TU-APP.azurewebsites.net/api';

// Stream MJPEG de la cámara de la Raspberry Pi (el celular debe estar en la misma red Wi-Fi).
export const CAMERA_URL = 'http://IP_DE_LA_RASPBERRY:8000/stream.mjpg';

// Segundos máximos de espera por petición antes de avisar que no hay conexión.
export const TIMEOUT_MS = 20000;
