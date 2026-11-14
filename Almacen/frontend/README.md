# Almacén Inteligente: app móvil (Expo Go + React Native)

Frontend del proyecto integrador 5 "Almacén Inteligente". App móvil con dos roles (administrador y operador) que consume
la API en Azure y muestra la cámara de la Raspberry Pi. Hecha con **Expo (Expo Go) y React Native**, en JavaScript.

## Cómo correrla
1. Instala [Node.js LTS](https://nodejs.org) y la app **Expo Go** en tu celular (misma red Wi-Fi que la computadora).
2. En la carpeta del proyecto (donde está `package.json`):
   ```bash
   npm install
   npx expo start --clear
   ```
3. Escanea el QR con Expo Go (Android) o con la cámara (iPhone).
   También puedes presionar `w` para abrirla en el navegador.

## Modo demo (sin backend)
Con `USE_MOCK = true` en `src/config.js` (valor actual) la app funciona sola con datos de ejemplo.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@almacen.com | admin123 |
| Operador | operador@almacen.com | op123 |

## Conectar con el backend
Todo se configura en **`src/config.js`**:
```js
export const USE_MOCK = false;                                   // usar la API real
export const BASE_URL = 'https://TU-APP.azurewebsites.net/api';  // API en Azure
export const CAMERA_URL = 'http://IP_DE_LA_RASPBERRY:8000/stream.mjpg'; // cámara de la Raspberry
```
El contrato completo (rutas, cuerpos, respuestas, JWT y errores) está en [`docs/API.md`](docs/API.md).

## Funciones por rol
| Administrador | Operador |
|---|---|
| Inventario en tiempo real por anaquel | Inventario: existencias y ubicación de cada producto |
| Alta y baja de productos, punto de reorden | Registrar entradas y salidas de mercancía |
| Estadísticas: rotación, predicción de agotamiento, historial | Su propio historial de movimientos |
| Alertas de reabastecimiento y pedidos de reorden | |
| Cámara del almacén en vivo | |
| Gestión de usuarios | |
| Identificar o registrar productos con la cámara del celular (ambos roles) | |

"Tiempo real" se logra consultando la API cada 5 segundos.

## Estructura
```
App.js                  Navegación por pestañas según el rol y control de sesión
src/config.js           USE_MOCK, BASE_URL, CAMERA_URL
src/api.js              Todo el acceso a datos (API real o datos de ejemplo)
src/jwt.js              Lectura y validación del JWT en el celular
src/plataforma.js       Almacenamiento seguro y avisos (celular y navegador)
src/components.js       Componentes compartidos y hook useData
src/screens/            Login, Inventario, Estadisticas, Alertas, Camara, Usuarios, Movimientos, Escanear
docs/API.md             Contrato de la API para el backend
```

## Notas
- La sesión se guarda con `expo-secure-store` y se reutiliza mientras el JWT siga vigente; si el servidor responde 401, se cierra sola.
- La cámara usa `http://` hacia la Raspberry (red local). En Expo Go funciona; en una compilación independiente habría que permitir tráfico HTTP.
