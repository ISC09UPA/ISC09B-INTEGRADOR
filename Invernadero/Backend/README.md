# Backend Invernadero Inteligente

Backend .NET 10 con cuatro proyectos: API (HTTP y composición de dependencias), Application (contratos y reglas de aplicación), Domain (entidades del negocio) e Infrastructure (procesamiento en background y persistencia).

## Requisitos

- .NET SDK 10
- Acceso a NuGet para restaurar paquetes
- Credenciales vigentes para los servicios de Azure que se vayan a probar

## Configurar secretos localmente

El `appsettings.json` no guarda claves. En PowerShell, establece las variables antes de iniciar la API. Las variables solo viven en la terminal actual:

```powershell
$env:AzureBlob__ConnectionString = '<connection string de la cuenta de Storage>'
$env:AzureBlob__ContainerName = 'blobstorage'
$env:CustomVision__Endpoint = 'https://<recurso>.cognitiveservices.azure.com/'
$env:CustomVision__PredictionKey = '<prediction key vigente>'
$env:CustomVision__ProjectId = '<GUID del proyecto>'
$env:CustomVision__PublishedName = '<nombre exacto de la iteración publicada>'
$env:ServiceBus__LecturasConnectionString = '<SAS de la cola lecturas>'
$env:ServiceBus__ComandosConnectionString = '<SAS de la cola comando>'
$env:ServiceBus__ColaLecturas = 'lecturas'
$env:ServiceBus__ColaComandos = 'comando'
```

Las claves antiguas que estaban escritas en la configuración deben rotarse en Azure antes de usarlas de nuevo. No las pegues en el repositorio. Para desarrollo también puedes guardar los valores con `dotnet user-secrets` desde la carpeta del API.

## Compilar e iniciar

Desde `Invernadero\Backend`:

```powershell
dotnet restore .\InvernaderoInteligente.slnx
dotnet build .\InvernaderoInteligente.slnx
dotnet run --project .\InvernaderoInteligente.API\InvernaderoInteligente.API.csproj
```

La API HTTP local inicia en `http://localhost:5010`; en Development publica OpenAPI en `/openapi/v1.json`.

## Probar Custom Vision

1. Publica una iteración del clasificador y copia el nombre publicado, Project ID, endpoint y Prediction Key al entorno.
2. Sube una imagen al contenedor `blobstorage` y copia el nombre del blob (incluye subcarpetas si las hay).
3. Envía:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:5010/api/images/classify' -ContentType 'application/json' -Body '{"blobName":"tomate.jpg"}'
```

La respuesta incluye `topTag`, `topProbability`, la lista de `predictions` y la hora UTC. Un blob inexistente responde 404. Una imagen no aceptada o credenciales inválidas genera un error HTTP de Custom Vision.

## Probar Service Bus

- **Comandos salientes:** con `ServiceBus__ComandosConnectionString` configurado, publica un mensaje JSON en la cola `comando`:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:5010/api/commands' -ContentType 'application/json' -Body '{"dispositivo":"raspberry-1","comando":"riego","valor":"iniciar"}'
```

  La API responde 202. Revisa la cola con Azure Portal o una suscripción de prueba; el mensaje expira a los dos minutos.
- **Lecturas entrantes:** configura `ServiceBus__LecturasConnectionString` con permiso Listen en `lecturas`. El worker procesa mensajes automáticamente, deserializa el lote y registra en consola el dispositivo, el número de macetas y la temperatura. JSON inválido va a dead-letter; JSON válido se completa. Para probarlo, manda un mensaje con esta forma:

```json
{"dispositivo":"raspberry-1","temperaturaC":24.5,"macetas":[{"maceta":"M1","humedad":61.2,"temperaturaC":22.8}]}
```

Los secretos de Service Bus deben tener permiso Send o Listen según la conexión usada. Las colas `lecturas` y `comando` deben existir.

## Cómo está desarrollado y dónde modificarlo

- **Custom Vision:** `Application/Interfaces/ICustomVisionService.cs` define el contrato y `DTOs/ImageClassificationDtos.cs` las respuestas. `Application/Services/CustomVisionService.cs` envía el stream binario a la ruta de Prediction API y mapea las predicciones. `ImageClassificationService` primero comprueba y abre el blob y luego solicita la clasificación. El endpoint está en `API/Controllers/ImagesController.cs`. Cambia el endpoint, el modelo de respuesta o el umbral de decisión ahí; credenciales y nombre de iteración vienen de configuración.
- **Bus Services:** `Application/Interfaces/IBusServices.cs`, `DTOs/ComandoDto.cs` y `DTOs/LoteLecturas.cs` definen los contratos JSON. `Application/Services/BusSerivice.cs` publica comandos con TTL de dos minutos. `Infrastructure/BackgroundServices/LecturasWorker.cs` escucha la cola de lecturas y decide completar o enviar a dead-letter. La API de prueba de comandos está en `API/Controllers/CommandsController.cs`; el procesamiento del lote está en `Application/Services/ProcesarLecturasService.cs` (actualmente solo registra el lote; ahí se agrega persistencia o reglas de automatización).
- **Registro de servicios:** `Application/Services/ImageClassificationRegistration.cs` enlaza configuración y registra Blob Storage, el cliente HTTP de Custom Vision y el servicio de clasificación. `API/Program.cs` compone los servicios y habilita el worker solo cuando existe la conexión de lecturas.
- **Persistencia:** el proyecto de dominio contiene `Lectura`, `Sensor` y `TipoSensor`; `Infrastructure/Persistence/AppDbContext.cs` es el punto de partida para persistencia. Actualmente el procesamiento de lecturas no guarda en base de datos.

Al cambiar propiedades de los mensajes, actualiza juntos los DTO, los productores/consumidores y los ejemplos de prueba; los nombres JSON deben coincidir con el formato que envían los dispositivos.

