# Almacén Inteligente: app móvil (Expo / React Native)

## Cómo correrla
```
npm install
npx expo start --clear
```
Escanea el QR con Expo Go (celular y computadora en la misma red). Con la tecla `w` se abre en el navegador (extra, la app se presenta en el celular).
Para entrar se usan las cuentas reales de `admin` y `operador`, que se pasan en privado y no van en el repositorio.

## Configuración (`src/banderas.js`)
- `USE_MOCK`: `true` usa datos de ejemplo sin internet (en ese modo cualquier contraseña funciona con `admin@almacen.com` u `operador@almacen.com`).
- Banderas de rutas: `USUARIOS_EN_API`, `ALERTAS_EN_API` y `PEDIDOS_EN_API` en `true` (contrato 2.4). `FOTO_EN_API` (meta 26 nov) y `PROVEEDORES_EN_API` (meta 27 nov)
  se cambian a `true` el día que Sebastián publique su ruta. Mientras estén en `false`, la app usa un respaldo local.
- `CAMERA_URL`: dirección del stream de la cámara (celular y Raspberry en la misma red). Pendiente.

## Contrato de la API
La única referencia es `contrato-api-almacen.md` (versión 2.4, Sebastián Román). Todo el acceso a datos está en `src/api.js`.

## Sesión con JWT
La app revisa que el JWT tenga formato válido y que no haya expirado (`exp`). La firma la valida el backend en cada petición.
El rol debe ser exactamente `admin` u `operador`. El token se guarda con expo-secure-store (en el navegador, con localStorage).
Si el token vence o el servidor responde 401, la app cierra la sesión.
