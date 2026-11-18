# Alimentador Inteligente — Panel de administración

App web para quienes administran el sistema del comedero de perro y gato (ESP32-S3, Raspberry Pi como gateway, backend .NET y app Expo). Desde aquí se revisan cuentas, alimentadores y mascotas, el estado de las Raspberry Pi y sus ESP32, los eventos de hardware, las fotos dudosas para reentrenar el modelo y las actualizaciones OTA.

Es una app aparte de la app móvil (`../mobile`). Usa **Vite + React + TypeScript** y **Fluent UI React v9** (`@fluentui/react-components` y `@fluentui/react-icons`), que implementa el sistema de diseño **Fluent 2**.

## Requisitos

- Node.js 20.19 o posterior (probado con 22) y npm.
- Para usarlo con datos reales: el backend de `Alimentador/Backend` corriendo (por defecto en `http://localhost:5126`) con los endpoints de `/api/admin/*`.

```bash
npm install
```

## Correr contra el backend

1. Copia `.env.example` a `.env` y ajusta la URL si hace falta:

   ```bash
   VITE_API_URL=http://localhost:5126
   VITE_DEMO=0
   ```

2. El backend debe permitir el origen del panel. En desarrollo ya viene en `appsettings.Development.json`:

   ```json
   "Cors": { "Origenes": [ "http://localhost:8081", "http://localhost:5173" ] }
   ```

   El panel manda `Authorization: Bearer <token>` y no usa cookies.

3. Hazte administrador. El primer administrador sale de la lista `Admin:CorreosIniciales` del backend; el correo se marca como administrador al registrarse, iniciar sesión o renovar tokens:

   ```bash
   cd ../../Backend/AlimentadorInteligente.API
   dotnet user-secrets set "Admin:CorreosIniciales:0" "tu-correo@example.com"
   ```

   En Azure App Service: `Admin__CorreosIniciales__0`, `Admin__CorreosIniciales__1`, etc. Después, los demás administradores se nombran desde la página **Usuarios** del panel.

4. Levanta el panel:

   ```bash
   npm run dev        # http://localhost:5173
   ```

Si una cuenta sin rol de administrador inicia sesión, el panel la rechaza con un mensaje y revoca el refresh token que acaba de recibir. Una cuenta desactivada ve el mensaje del backend (`403`).

## Modo demo (sin backend)

Para revisar el panel sin levantar el backend hay un servidor de datos falsos integrado en Vite (`demo/servidor.ts`). Responde `/api/*` siguiendo el contrato y aplica las reglas principales: no quitarse el propio rol, último administrador activo, cuentas desactivadas, omitidos de un despliegue (“Ya tiene esa versión.”, “Ya tiene una actualización en curso.”), cancelar solo despliegues `Pendiente` (409 si no), artefactos repetidos (409) o ya usados (409), fotos sin subir (400) y filtros con valores inválidos (400). Las OTA pendientes avanzan solas a Entregado y Completado en los alimentadores en línea, para ver la auto-actualización.

```bash
npm run demo                      # vite --mode demo (usa .env.demo)
# o bien
VITE_DEMO=1 VITE_API_URL= npx vite
# o con el build de producción
npm run build:demo && npm run preview:demo   # http://localhost:4173
```

Cuentas de prueba (contraseña `demo1234`):

| Correo | Qué muestra |
| --- | --- |
| `admin@demo.mx` | Administrador; entra al panel |
| `mariana.lopez@demo.mx` | Otra administradora |
| `ana@demo.mx` | Usuario normal: el panel lo rechaza |
| `jorge.delgado@demo.mx` | Cuenta desactivada: 403 del backend |

Las fotos dudosas son SVG generados en el propio servidor (`demo/fotos.ts`); no se descarga nada de internet. Los datos viven en memoria y se reinician al reiniciar Vite.

## Build

```bash
npm run typecheck   # tsc --noEmit (TypeScript estricto)
npm run build       # typecheck + vite build → dist/
npm run preview     # sirve dist/ en http://localhost:4173
```

`dist/` es estático. Al publicarlo, el servidor debe responder `index.html` en cualquier ruta (React Router usa rutas del navegador) y `VITE_API_URL` debe apuntar al backend al momento de compilar.

## Sesión y tokens

- `POST /api/auth/login` entrega un access token (15 min) y un refresh token rotativo. El cliente HTTP (`src/api/cliente.ts`) agrega `Authorization: Bearer` a cada petición.
- Si el access token está por vencer o una petición responde **401**, el cliente pide **una sola** renovación a `POST /api/auth/refresh` aunque fallen varias peticiones a la vez (todas esperan la misma promesa) y reintenta una vez. Si la renovación falla, cierra la sesión y la pantalla de inicio explica que expiró.
- Si una ruta `/api/admin/*` responde **403** (te quitaron el rol o desactivaron tu cuenta; el backend lo revisa en cada petición), el panel cierra la sesión con ese aviso.
- Al recargar la página con una sesión guardada se confirma con `GET /api/auth/yo` que sigue siendo administrador.
- Cerrar sesión llama a `POST /api/auth/logout` para revocar el refresh token.

**Por qué `sessionStorage` y no `localStorage`:** los tokens de esta app abren acciones con privilegios (cambiar roles, desactivar cuentas, mandar firmware). `sessionStorage` se borra al cerrar la pestaña y no se comparte con otras pestañas ni ventanas, así que un token robado o un equipo compartido quedan expuestos mucho menos tiempo que con `localStorage`, que persiste indefinidamente. Ninguno de los dos protege contra XSS (el código de la página puede leerlos), por eso además no se usa `dangerouslySetInnerHTML` ni se insertan datos como HTML. La desventaja aceptada es que cada pestaña nueva pide iniciar sesión. Lo único que se guarda en `localStorage` es la preferencia de tema.

## Datos y actualización

- TanStack Query maneja caché, reintentos (no reintenta errores 4xx) e invalidación tras cada cambio.
- **Resumen**, **Embebidos** (Raspberry Pi, eventos y fotos) y los **despliegues OTA** se actualizan solos cada 30 s; se pausa cuando la pestaña está oculta y se recarga al volver a ella.
- Filtros, búsqueda, página y pestaña viven en la URL (`?buscar=&estado=&pagina=`), así que Atrás y los enlaces compartidos conservan la vista.

## Pantallas

| Ruta | Contenido |
| --- | --- |
| `/login` | Inicio de sesión; rechaza cuentas sin rol de administrador |
| `/` | **Resumen**: indicadores (usuarios, alimentadores en línea, sin conexión y sin Raspberry Pi, Raspberry Pi, mascotas, alertas 24 h, OTA en curso y fallidas, fotos por revisar) que llevan a su sección, y distribución de versiones de firmware y modelo |
| `/usuarios` | Tabla paginada con búsqueda, insignias de administrador e inactivo, panel de detalle (`?usuario=ID`) con membresías y Raspberry Pi; hacer o quitar administrador y activar o desactivar con confirmación (no aparecen sobre tu propia cuenta) |
| `/alimentadores` | Tabla paginada con búsqueda y filtro de estado; conexión, tolvas, versiones y última sincronización |
| `/alimentadores/:id` | Detalle: tolvas de perro y gato, platos, versiones, configuración, miembros, mascotas (incluidas las dadas de baja), horarios, últimos comandos y alertas |
| `/embebidos` | Pestañas **Raspberry Pi** (estado, heartbeat, sincronización y sus ESP32; regenerar clave mostrándola una sola vez con botón copiar), **Eventos** (atascos y tolva baja, paginados con filtros) y **Fotos dudosas** (cuadrícula con predicción y confianza; clasificar como Perro, Gato, Paloma o Nada; filtro pendientes/revisadas/todas) |
| `/ota` | Pestañas **Artefactos** (subir con progreso y validación de 32 MB, borrar, SHA-256 abreviado copiable, tamaño legible) y **Despliegues** (historial paginado con filtros por estado, artefacto y alimentador; cancelar los Pendiente) |
| `/ota/desplegar` | Lanzar un despliegue: elegir artefacto, seleccionar alimentadores (la selección se conserva entre páginas) viendo su versión actual, “omitir si ya tiene la versión”, y ver creados y omitidos con su motivo |

Todas las vistas tienen estado de carga (Skeleton o Spinner), vacío (con una acción cuando aplica) y error (MessageBar con **Reintentar**). Los éxitos se avisan con un toast; los errores de una acción con diálogo se muestran dentro del diálogo con el `detail` del backend.

## Estructura

```
admin/
├─ demo/                 Servidor de datos falsos (solo con VITE_DEMO=1)
│  ├─ datos.ts           Usuarios, alimentadores, Pi, artefactos, comandos, eventos y fotos
│  ├─ fotos.ts           SVG de las fotos dudosas
│  └─ servidor.ts        Middleware de Vite con las rutas /api/*
├─ public/               favicon
├─ src/
│  ├─ api/               cliente.ts (fetch + Bearer + renovación), endpoints.ts, types.ts (contrato)
│  ├─ auth/              sesion.ts (sessionStorage) y AuthContext.tsx
│  ├─ components/        Marco (barra superior + NavDrawer), Tabla, Encabezado, Estados, diálogos, insignias…
│  ├─ hooks/             URL como estado, búsqueda con retraso, media queries, anuncios para lectores de pantalla
│  ├─ pages/             Una carpeta o archivo por pantalla (usuarios/, embebidos/, ota/)
│  ├─ theme/             Tema claro/oscuro de Fluent 2 (sigue al sistema; se cambia en la barra superior)
│  └─ utils/             Fechas relativas y absolutas en es-MX (Intl), tamaños, etiquetas
├─ .env.example          VITE_API_URL y VITE_DEMO
└─ .env.demo             Variables de `npm run demo`
```

## Diseño y accesibilidad

- Tema `webLightTheme` / `webDarkTheme`; por defecto sigue la preferencia del sistema y se puede fijar en el menú de tema de la barra superior (en móvil, dentro del menú de la cuenta).
- Estilos con `makeStyles` y `tokens` de Fluent; el único CSS suelto es un reset mínimo (`src/reset.css`).
- Navegación lateral `NavDrawer` fija en pantallas de 768 px o más (se oculta con el botón de menú) y superpuesta en pantallas angostas. Por debajo de 640 px las tablas se muestran como lista.
- Etiquetas visibles en todos los filtros (`Field`), nombres accesibles en botones de solo ícono (`Tooltip` con `relationship="label"`), insignias con texto e ícono (el color nunca es la única señal), anuncios de resultados con `AriaLiveAnnouncer`, foco al contenido al cambiar de página y enlace “Saltar al contenido”.
