/* =====================================================================
   Estacionamiento Inteligente · Creación de tablas (Azure SQL / LocalDB)
   ---------------------------------------------------------------------
   Este script es la definición oficial de la base del backend.
   Corresponde 1 a 1 con los modelos de EstacionamientoInteligente.Domain/Models.

   Convenciones:
   - Ids UNIQUEIDENTIFIER: el backend genera el Guid al crear la entidad
     (EntidadBase), así un paso por la pluma (acceso + alerta + evento)
     se guarda completo en una sola transacción.
   - Fechas DATETIME2 siempre en UTC.
   - Los enums se guardan como texto ("Libre", "Carro"), igual que en la API.
   - Las FKs no borran en cascada: en este sistema nada se elimina,
     los vehículos se dan de baja y las alertas se marcan como atendidas.

   Si las tablas ya existen con otra estructura (por ejemplo, ids INT),
   primero hay que borrarlas con el bloque comentado al final del archivo.
   ===================================================================== */

/* ---------- Usuarios ---------- */
IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Usuarios (
        id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Usuarios PRIMARY KEY,
        nombre           NVARCHAR(100)    NOT NULL,
        correo           NVARCHAR(150)    NOT NULL,   -- se guarda en minúsculas (Usuario.NormalizarCorreo)
        contrasena_hash  NVARCHAR(255)    NOT NULL,   -- BCrypt, nunca texto plano
        rol              NVARCHAR(20)     NOT NULL,
        fecha_registro   DATETIME2        NOT NULL,
        CONSTRAINT UK_Usuarios_correo UNIQUE (correo),
        CONSTRAINT CK_Usuarios_rol CHECK (rol IN (N'Usuario', N'Administrador'))
    );
END;
GO

/* ---------- Vehiculos ---------- */
IF OBJECT_ID(N'dbo.Vehiculos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Vehiculos (
        id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Vehiculos PRIMARY KEY,
        placa          NVARCHAR(20)     NULL,       -- "ABC-123-A"; NULL = placa no legible
        placa_clave    NVARCHAR(10)     NULL,       -- "ABC123A"; es la que se compara y busca
        tipo_vehiculo  NVARCHAR(20)     NOT NULL CONSTRAINT DF_Vehiculos_tipo DEFAULT (N'Desconocido'),
        id_usuario     UNIQUEIDENTIFIER NULL,
        estado         NVARCHAR(10)     NOT NULL,
        fecha_alta     DATETIME2        NOT NULL,
        fecha_baja     DATETIME2        NULL,
        CONSTRAINT FK_Vehiculos_Usuarios FOREIGN KEY (id_usuario) REFERENCES dbo.Usuarios (id),
        CONSTRAINT CK_Vehiculos_tipo   CHECK (tipo_vehiculo IN (N'Desconocido', N'Carro', N'Camioneta', N'Moto', N'Camion')),
        CONSTRAINT CK_Vehiculos_estado CHECK (estado IN (N'Alta', N'Baja')),
        CONSTRAINT CK_Vehiculos_placa  CHECK ((placa IS NULL AND placa_clave IS NULL) OR (placa IS NOT NULL AND placa_clave IS NOT NULL))
    );

    -- Placa única, pero puede haber varios vehículos con placa no legible (NULL).
    CREATE UNIQUE INDEX UK_Vehiculos_placa_clave ON dbo.Vehiculos (placa_clave) WHERE placa_clave IS NOT NULL;
    CREATE INDEX IX_Vehiculos_id_usuario ON dbo.Vehiculos (id_usuario);
END;
GO

/* ---------- Cajones ---------- */
IF OBJECT_ID(N'dbo.Cajones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Cajones (
        id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Cajones PRIMARY KEY,
        numero         INT              NOT NULL,
        estado         NVARCHAR(10)     NOT NULL,
        ultimo_cambio  DATETIME2        NOT NULL,
        CONSTRAINT UK_Cajones_numero UNIQUE (numero),
        CONSTRAINT CK_Cajones_numero CHECK (numero >= 1),
        CONSTRAINT CK_Cajones_estado CHECK (estado IN (N'Libre', N'Ocupado'))
    );
END;
GO

/* ---------- Accesos ---------- */
IF OBJECT_ID(N'dbo.Accesos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Accesos (
        id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Accesos PRIMARY KEY,
        id_vehiculo      UNIQUEIDENTIFIER NOT NULL,
        id_cajon         UNIQUEIDENTIFIER NULL,     -- último cajón donde se estacionó (se conserva para el historial)
        estacionado      BIT              NOT NULL CONSTRAINT DF_Accesos_estacionado DEFAULT (0),
        sin_cajon_desde  DATETIME2        NULL,     -- dentro pero sin cajón desde esta hora
        hora_entrada     DATETIME2        NOT NULL,
        hora_salida      DATETIME2        NULL,     -- NULL = el auto sigue dentro (acceso abierto)
        foto_entrada     NVARCHAR(300)    NOT NULL, -- nombre del archivo en Blob Storage
        foto_salida      NVARCHAR(300)    NULL,
        confianza_ocr    FLOAT            NOT NULL CONSTRAINT DF_Accesos_confianza DEFAULT (0),
        origen           NVARCHAR(10)     NOT NULL,
        CONSTRAINT FK_Accesos_Vehiculos FOREIGN KEY (id_vehiculo) REFERENCES dbo.Vehiculos (id),
        CONSTRAINT FK_Accesos_Cajones   FOREIGN KEY (id_cajon)    REFERENCES dbo.Cajones (id),
        CONSTRAINT CK_Accesos_confianza CHECK (confianza_ocr BETWEEN 0 AND 1),
        CONSTRAINT CK_Accesos_origen    CHECK (origen IN (N'Maqueta', N'Escaner')),
        CONSTRAINT CK_Accesos_horas     CHECK (hora_salida IS NULL OR hora_salida >= hora_entrada)
    );

    -- Pluma: "¿esta placa tiene un acceso abierto?"
    CREATE INDEX IX_Accesos_vehiculo_salida ON dbo.Accesos (id_vehiculo, hora_salida);
    -- Historial y estadísticas por periodo.
    CREATE INDEX IX_Accesos_hora_entrada ON dbo.Accesos (hora_entrada);
    -- Sensores: "¿quién está estacionado en este cajón?"
    CREATE INDEX IX_Accesos_cajon ON dbo.Accesos (id_cajon) WHERE hora_salida IS NULL;
END;
GO

/* ---------- Alertas ---------- */
IF OBJECT_ID(N'dbo.Alertas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Alertas (
        id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Alertas PRIMARY KEY,
        tipo                NVARCHAR(30)     NOT NULL,
        mensaje             NVARCHAR(255)    NOT NULL,
        placa               NVARCHAR(20)     NULL,
        foto                NVARCHAR(300)    NULL,
        id_vehiculo         UNIQUEIDENTIFIER NULL,
        fecha               DATETIME2        NOT NULL,
        atendida            BIT              NOT NULL CONSTRAINT DF_Alertas_atendida DEFAULT (0),
        fecha_atencion      DATETIME2        NULL,
        id_usuario_atiende  UNIQUEIDENTIFIER NULL,  -- administrador que la atendió
        CONSTRAINT FK_Alertas_Vehiculos FOREIGN KEY (id_vehiculo)        REFERENCES dbo.Vehiculos (id),
        CONSTRAINT FK_Alertas_Usuarios  FOREIGN KEY (id_usuario_atiende) REFERENCES dbo.Usuarios (id),
        CONSTRAINT CK_Alertas_tipo CHECK (tipo IN (N'EntradaNegada', N'PlacaNoLegible', N'CajonSinSalida'))
    );

    CREATE INDEX IX_Alertas_atendida_fecha ON dbo.Alertas (atendida, fecha DESC);
    CREATE INDEX IX_Alertas_vehiculo ON dbo.Alertas (id_vehiculo);
END;
GO

/* ---------- EventosSensor ---------- */
IF OBJECT_ID(N'dbo.EventosSensor', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EventosSensor (
        id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_EventosSensor PRIMARY KEY,
        dispositivo  NVARCHAR(50)     NOT NULL,   -- "pluma" o "cajon-1" ... "cajon-4"
        tipo         NVARCHAR(10)     NOT NULL,
        valor        NVARCHAR(100)    NOT NULL,   -- "abierta"/"cerrada" u "ocupado"/"libre"
        detalle      NVARCHAR(255)    NULL,       -- por ejemplo, quién abrió la pluma a mano
        fecha        DATETIME2        NOT NULL,
        CONSTRAINT CK_EventosSensor_tipo CHECK (tipo IN (N'Cajon', N'Pluma'))
    );

    -- Estado actual de la pluma: último evento de tipo Pluma.
    CREATE INDEX IX_EventosSensor_tipo_fecha ON dbo.EventosSensor (tipo, fecha DESC);
END;
GO

/* =====================================================================
   SOLO si ya existían tablas con otra estructura (ids INT del diagrama
   anterior). Borra TODO y los datos se pierden. Quita el comentario,
   ejecútalo una vez y luego corre este script completo.
   ---------------------------------------------------------------------
DROP TABLE IF EXISTS dbo.EventosSensor;
DROP TABLE IF EXISTS dbo.Alertas;
DROP TABLE IF EXISTS dbo.Accesos;
DROP TABLE IF EXISTS dbo.Cajones;
DROP TABLE IF EXISTS dbo.Vehiculos;
DROP TABLE IF EXISTS dbo.Usuarios;
   ===================================================================== */
