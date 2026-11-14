# Cambios sobre la versión inicial del frontend

Revisión del avance del frontend (Expo Go + React Native) contra la rúbrica del proyecto integrador 5, "Almacén Inteligente".
Objetivo: dejar la app lista para conectarse al backend en Azure sin tocar el código de las pantallas.

Resultado de la revisión: la versión inicial ya cubría todas las funciones que pide la rúbrica para los roles de administrador
y operador y para la identificación de productos con la cámara del celular. Los cambios son de robustez, configuración y entrega.

## Agregado
| Archivo | Qué es |
|---|---|
| `src/config.js` | Configuración central: `USE_MOCK`, `BASE_URL`, `CAMERA_URL` y tiempo límite de peticiones. Antes estaba dentro de `api.js`. |
| `docs/API.md` | Contrato de la API para el equipo de backend: rutas, cuerpos, respuestas, claims del JWT, permisos por rol y manejo de errores. |
| `CAMBIOS.md` | Este documento. |
| Componente `Cargando` (`src/components.js`) | Pantalla de carga que, si falla la red o el servidor, muestra el mensaje y un botón "Reintentar". |
| Validación de números en `FormProducto` | El punto de reorden y las existencias no pueden superar la capacidad; no se aceptan negativos. |
| Validación en "Registrar movimiento" | Cantidad entera mayor a 0 y salida no mayor a las existencias, antes de llamar al servidor. |
| "Ver todos / Ver menos" en Estadísticas | El historial mostraba solo 10 movimientos; ahora se puede ver completo. |
| Rotación y predicción desde el backend | Si `GET /productos` trae `rotacion` y `diasAgotamiento` (calculados en la nube, como pide la rúbrica), la app los usa; si no vienen, los calcula como antes. |

## Corregido
- **Respuestas sin cuerpo (204 No Content):** `http()` hacía siempre `r.json()`, por lo que un DELETE o PUT exitoso habría mostrado error al conectar el backend. Ahora una respuesta vacía se toma como éxito.
- **Errores silenciosos:** `useData` ignoraba los errores y la pantalla se quedaba en "Cargando…" para siempre. Ahora devuelve el error y se muestra con opción de reintentar.
- **Acciones sin manejo de errores:** alta, baja y cambio de reorden de productos, baja de usuarios y alta desde la cámara no tenían `try/catch`. Ahora avisan el motivo si el servidor las rechaza.
- **Historial del operador filtrado por nombre:** dos operadores con el mismo nombre habrían visto los mismos movimientos. Ahora la app pide `GET /movimientos/mios` y el backend filtra por el usuario del token. En `POST /movimientos` y al recibir pedidos ya no se envía el nombre de usuario; el backend lo toma del token.
- **Foto sin control de sesión:** `identificarProducto` hacía su propio `fetch` sin revisar el 401 ni el tiempo de espera. Ahora usa el mismo `http()` que el resto.
- **Sin tiempo límite en las peticiones:** ahora hay un límite de 20 s y un mensaje claro de "No se pudo conectar con el servidor".
- **Mensajes de error del servidor:** se lee el mensaje del cuerpo (texto o JSON con `message`, `mensaje`, `title` o `error`); el 403 muestra un aviso de permisos.

## Modificado
- `src/api.js`: usa `config.js`; el login envía `{ email, password }` (antes `pass`); `crearUsuario` envía `password`; `getMovimientos({ mios, usuario })`; si `BASE_URL` sigue con el valor de ejemplo, avisa que falta configurarla en lugar de fallar con un error confuso.
- `src/screens/Login.js`: se quitó el texto "Versión 3…" y las credenciales de prueba solo se muestran con `USE_MOCK = true`.
- `src/screens/Camara.js`: `CAMERA_URL` se importa de `config.js`.
- Pantallas `Inventario`, `Estadisticas`, `Alertas`, `Usuarios` y `Movimientos`: uso de `Cargando`, manejo de errores y validaciones descritas arriba.
- `README.md`: reescrito (instalación, modo demo, conexión con el backend, funciones por rol, estructura).

## Eliminado
- `LEEME.txt`: reemplazado por el `README.md`.
- Importaciones sin uso de `Alert` en cinco archivos.
- `node_modules/` y `.expo/` del paquete (se regeneran con `npm install`).

## Verificación realizada
- `npm ci` con el `package-lock.json` incluido: instala sin errores. Las versiones de `package.json` coinciden con las que Expo SDK 58 espera (`bundledNativeModules.json`).
- La app compila con Metro para web y para Android (Hermes) sin errores de sintaxis ni de importaciones.
- `src/api.js` probado con un servidor simulado en modo real (login, 204 sin cuerpo, errores 400/403/500, 401 que cierra sesión, tiempo agotado, sin conexión, cuerpos enviados) y en modo demo.
- **No se probó en un dispositivo físico con Expo Go**: falta esa prueba manual (login, cámara, WebView del stream).

## Pendiente (depende del backend y de la maqueta)
1. Implementar la API según `docs/API.md`, poner `USE_MOCK = false` y la `BASE_URL` de Azure en `src/config.js`.
2. Poner la IP real de la Raspberry en `CAMERA_URL` (celular y Raspberry en la misma red Wi-Fi).
3. Validar los permisos por rol también en el servidor.
4. Calcular rotación y predicción de agotamiento en la nube y devolverlas en `GET /productos`.
