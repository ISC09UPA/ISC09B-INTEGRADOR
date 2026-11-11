# Alimentador Inteligente — App móvil

App en Expo (SDK 57, React Native, expo-router) para el comedero de perro y gato. Consume la API .NET de la rama `AlimentadorBack`.

## Ejecutar

```bash
npm install
cp .env.example .env        # ajusta EXPO_PUBLIC_API_URL (en un teléfono usa la IP de tu PC)
npx expo start
npx tsc --noEmit            # verificación de tipos
npx expo export --platform web
```

`expo-camera`, `expo-notifications` y `expo-secure-store` traen código nativo: para probar todo en un teléfono hace falta un development build (`npx expo run:android` o `eas build --profile development`). En web la sesión se guarda en `localStorage`.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `src/app/` | Rutas de expo-router: `(auth)` (login, registro), `(tabs)` (inicio, mascotas, historial, dispensador, cámara) y pantallas apiladas |
| `src/screens/` | Implementación de cada pantalla (los nombres siguen los mockups) |
| `src/api/` | Cliente HTTP con renovación de token en 401, endpoints tipados, tipos de los DTOs y conexión SignalR |
| `src/context/` | Sesión (`AuthContext`) y alimentador/mascota seleccionados con eventos en tiempo real (`AlimentadorContext`) |
| `src/components/` | Botones, campos, tarjetas, barra de pestañas y formularios compartidos |
| `src/theme/` | Colores y tipografías tomados de los mockups |
| `src/storage/` | Almacenamiento seguro y datos locales (raza y foto de cada mascota, preferencias de alertas) |

## Sesión y tiempo real

- El access token dura 15 min; el cliente lo renueva con `/api/auth/refresh` antes de que venza o al recibir 401 y repite la petición. Los tokens se guardan con `expo-secure-store`.
- SignalR se conecta a `/hubs/alimentador?access_token=…`, se une al alimentador elegido con `UnirseAlimentador` y escucha `VisitaRegistrada`, `AlertaCreada`, `ComandoActualizado` y `EstadoAlimentador`.
- Al iniciar sesión se pide permiso de notificaciones y el token de Expo se manda a `PUT /api/auth/push-token`.
