# Almacén Inteligente: front de la app móvil (Expo / React Native)

## Cómo correrlo
1. `npx create-expo-app almacen-app --template blank`
2. Entra a la carpeta y copia dentro `App.js` y la carpeta `src` (reemplaza el App.js que trae).
3. Instala las dependencias:
   `npx expo install @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context expo-image-picker react-native-webview @expo/vector-icons expo-status-bar`
4. `npx expo start` y escanea el QR con Expo Go.

## Cuentas de prueba (modo demo)
- Administrador: admin@almacen.com / admin123
- Operador: operador@almacen.com / op123

## Conectar con el backend
Todo el acceso a datos está en `src/api.js`. Pon `USE_MOCK = false`, cambia `BASE_URL` (Azure) y `CAMERA_URL` (stream de la Raspberry).
Endpoints que espera: POST /auth/login, GET/POST /productos, DELETE /productos/{id}, PUT /productos/{id}/reorden,
GET/POST /movimientos, POST /productos/identificar (foto en el campo "foto").
