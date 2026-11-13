# Invernadero Inteligente — Aplicación móvil

Aplicación móvil para monitorear y controlar un invernadero inteligente: lectura de
sensores, riego manual, historial, gestión de plantas y dispositivos, alertas,
galería de fotos y perfil de usuario.

> Nota: actualmente la app funciona con **servicios mock en memoria** (carpeta
> `src/services/`). No se conecta a una API real; está diseñada para cambiarla
> por el backend sin tocar las pantallas.

## Stack

- [Expo](https://docs.expo.dev/) SDK 58 + React Native 0.88
- JavaScript (sin TypeScript)
- [React Navigation](https://reactnavigation.org/) (bottom tabs + stacks)
- Context API para el estado global (`src/context/AppContext.js`)

## Requisitos

- **Node.js** LTS (20 o superior) y npm
- [Expo Go](https://expo.dev/go) en tu teléfono, **o** un emulador
  (Android Studio / Xcode) con el dispositivo ya configurado
- Git

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/ISC09UPA/ISC09B-INTEGRADOR.git
cd ISC09B-INTEGRADOR/Invernadero/Frontend/mobile

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npx expo start
```

## Ejecutar la app

Con el servidor de desarrollo corriendo (`npx expo start`):

- **Teléfono físico:** instala Expo Go y escanea el código QR con la cámara
  (Android) o con la app de cámara (iOS). El teléfono y la computadora deben
  estar en la misma red Wi-Fi.
- **Emulador Android:** presiona `a` en la terminal (o ejecuta
  `npx expo start --android`).
- **Simulador iOS (solo macOS):** presiona `i` (o `npx expo start --ios`).

Otras variantes:

```bash
npm start          # igual que npx expo start
npm run android    # inicia y abre en emulador Android
npm run ios        # inicia y abre en simulador iOS
npm run web        # inicia la versión web
npm run lint       # ejecuta el linter (ESLint + eslint-config-expo)
```

## Credenciales de prueba

Como la autenticación usa datos mock, inicia sesión con:

| Campo             | Valor                    |
| ----------------- | ------------------------ |
| Correo            | `mariana@invernadero.app` |
| Contraseña        | `invernadero123`          |

También puedes crear una cuenta nueva desde la pantalla «Crear cuenta»; solo
persiste durante la sesión.

## Estructura del proyecto

```
src/
├── components/   # componentes reutilizables (ui, charts, TabBar)
├── context/      # estado global (AppContext)
├── data/         # datos mock (plantas, alertas, galería…)
├── navigation/   # AuthStack, MainTabs, MoreStack, RootNavigator
├── screens/      # pantallas (auth/, tabs/, more/)
├── services/     # servicios mock (se reemplazarán por la API real)
├── theme/        # tokens de diseño (colores, tipografía, espaciado…)
└── utils/        # formateadores y helpers
```

## Validar el proyecto

```bash
npx expo-doctor          # revisa dependencias y configuración
npx expo lint            # linter
```

## Builds con EAS (opcional)

El proyecto usa [EAS](https://docs.expo.dev/eas/) para compilar y firmar en la
nube sin necesidad de Android Studio ni Xcode:

```bash
npx eas-cli@latest build --profile development   # build de desarrollo
npx eas-cli@latest build --profile production    # build de producción
```

> Las carpetas `ios/` y `android/` se generan automáticamente (CNG); no deben
> editarse a mano.
