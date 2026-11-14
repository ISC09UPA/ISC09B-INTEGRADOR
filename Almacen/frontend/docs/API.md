# Contrato de la API (backend en Azure)

Este documento define lo que el **frontend (Expo / React Native) espera** del backend.
Todo el acceso a datos del frontend está en `src/api.js`; la URL se configura en `src/config.js` (`BASE_URL`).

- Formato: JSON (`Content-Type: application/json`), excepto la foto (multipart).
- Todas las rutas, salvo `/auth/login`, llevan el encabezado `Authorization: Bearer <token>`.
- Las fechas (`t`) pueden ser texto ISO 8601 (`2026-11-13T18:30:00Z`) o milisegundos desde 1970.
- Las respuestas de éxito pueden venir **sin cuerpo** (204 No Content) en POST/PUT/DELETE.

## Errores
| Código | Qué hace la app |
|---|---|
| 401 | Cierra la sesión y regresa al login |
| 403 | Muestra "No tienes permiso para realizar esta acción" |
| 400 / 409 / 422 / 500 | Muestra el mensaje del cuerpo: texto plano o JSON con `message`, `mensaje`, `title` o `error` |

## Sesión (JWT)
`POST /auth/login`
```json
{ "email": "admin@almacen.com", "password": "admin123" }
```
Respuesta 200: `{ "token": "<jwt>" }`. Credenciales incorrectas: 401 (o 400).

El JWT debe traer:
| Dato | Claim aceptado |
|---|---|
| Vigencia (obligatorio) | `exp` (segundos) |
| Rol (obligatorio, `admin` u `operador`) | `rol`, `role` o `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` |
| Nombre | `nombre`, `name` o `unique_name` |
| Correo | `email` o `sub` |

La app revisa formato, vigencia y rol; **la firma la valida el backend** en cada petición.
Los permisos por rol **deben validarse también en el servidor** (la app solo oculta pestañas).

## Productos
| Método y ruta | Rol | Cuerpo | Respuesta |
|---|---|---|---|
| `GET /productos` | admin, operador | | Lista de productos |
| `POST /productos` | admin, operador* | `{ nombre, anaquel, stock, reorden, max }` | 201/204 |
| `DELETE /productos/{id}` | admin | | 204 |
| `PUT /productos/{id}/reorden` | admin | `{ reorden }` | 204 |
| `POST /productos/identificar` | admin, operador | multipart, campo `foto` (JPEG) | Ver abajo |

\* El operador puede registrar un producto nuevo desde la pantalla de la cámara; el alta desde el inventario es solo del administrador (la app la oculta).

Producto:
```json
{
  "id": 1, "nombre": "Tornillos hexagonales", "anaquel": "A1",
  "stock": 420, "reorden": 150, "max": 600,
  "salidas30": 310,
  "rotacion": 0.74,
  "diasAgotamiento": 40,
  "ultimo": { "tipo": "salida", "cant": 50, "t": "2026-11-13T18:30:00Z" }
}
```
- `salidas30`: piezas que salieron en los últimos 30 días.
- `rotacion` y `diasAgotamiento` son **opcionales**: la rúbrica pide que se calculen en la nube. Si vienen, la app los muestra tal cual; si no, los calcula con `salidas30` y `stock`. `diasAgotamiento: null` = sin consumo.
- `ultimo`: último movimiento del producto (o `null`).

Respuesta de `POST /productos/identificar`:
```json
{ "encontrado": true, "confianza": 0.93, "producto": { "...": "objeto Producto" } }
```
```json
{ "encontrado": false, "etiqueta": "Caja de tornillos" }
```
`etiqueta` es el nombre sugerido para precargarlo al registrar el producto como nuevo.

## Movimientos
| Método y ruta | Rol | Cuerpo | Respuesta |
|---|---|---|---|
| `GET /movimientos` | admin | | Todos los movimientos, del más reciente al más antiguo |
| `GET /movimientos/mios` | admin, operador | | Solo los del usuario del token |
| `POST /movimientos` | admin, operador | `{ productoId, tipo, cant }` | 201/204 |

- `tipo`: `"entrada"` o `"salida"`. `cant`: entero mayor a 0.
- **El usuario NO se envía**: el backend lo toma del token.
- El backend valida: salida mayor a las existencias, o entrada que exceda `max`. Debe responder 400 con un mensaje claro (la app lo muestra tal cual).

Movimiento:
```json
{ "id": 8, "productoId": 7, "producto": "Etiquetas térmicas", "tipo": "salida", "cant": 10, "t": "2026-11-13T18:30:00Z", "usuario": "Luis Hernández" }
```

## Usuarios (solo administrador)
| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /usuarios` | | `[{ id, nombre, email, rol }]` (sin contraseña) |
| `POST /usuarios` | `{ nombre, email, password, rol }` (`rol`: `admin` u `operador`) | 201/204; correo repetido: 409 con mensaje |
| `DELETE /usuarios/{id}` | | 204 |

## Pedidos de reorden
| Método y ruta | Rol | Cuerpo | Respuesta |
|---|---|---|---|
| `GET /pedidos?estado=pendiente` | admin | | `[{ id, productoId, producto, cant, estado, t }]` |
| `POST /pedidos` | admin | `{ productoId, cant }` | 201/204 |
| `POST /pedidos/{id}/recibir` | admin | | 204. El backend registra la entrada de mercancía (con el usuario del token) y sube las existencias |

## Cámara
No pasa por la API: la app abre `CAMERA_URL` (`src/config.js`), un stream MJPEG de la Raspberry Pi, por ejemplo `http://192.168.1.50:8000/stream.mjpg`. El celular debe estar en la misma red Wi-Fi que la Raspberry.

## CORS
Solo importa si se prueba la app en el navegador (`npx expo start`, tecla `w`): el backend debe permitir el origen `http://localhost:8081`. En Expo Go no aplica.
