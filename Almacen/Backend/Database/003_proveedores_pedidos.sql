-- Almacén Inteligente · Cambio 003 · 24 nov 2026
-- Ejecutar en el Query editor de db-almacen ANTES de publicar la versión nueva de la API
-- (y antes de volver a publicar las Functions): las dos leen la columna Productos.proveedorId.
-- Crea proveedores y pedidos de reabastecimiento, y permite el origen PEDIDO en Movimientos.
-- Se puede ejecutar más de una vez sin problema.

-- 1) Proveedores. lat/lon se usan después para la ruta con Azure Maps.
IF OBJECT_ID('dbo.Proveedores', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Proveedores (
        id        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Proveedores PRIMARY KEY,
        nombre    NVARCHAR(100) NOT NULL,
        email     NVARCHAR(200) NOT NULL,
        telefono  NVARCHAR(30)  NULL,
        direccion NVARCHAR(300) NULL,
        lat       DECIMAL(9,6)  NULL,
        lon       DECIMAL(9,6)  NULL
    );
END
GO

-- 2) Proveedor de cada producto (puede quedar en NULL).
IF COL_LENGTH('dbo.Productos', 'proveedorId') IS NULL
    ALTER TABLE dbo.Productos ADD proveedorId INT NULL
        CONSTRAINT FK_Productos_Proveedores FOREIGN KEY REFERENCES dbo.Proveedores (id);
GO

-- 3) Pedidos de reabastecimiento.
--    Los tipos de productoId, alertaId y usuarioId se copian de las tablas originales
--    (una llave foránea exige exactamente el mismo tipo).
IF OBJECT_ID('dbo.Pedidos', 'U') IS NULL
BEGIN
    DECLARE @tipoProducto NVARCHAR(50), @tipoAlerta NVARCHAR(50), @tipoUsuario NVARCHAR(50);

    SELECT @tipoProducto = DATA_TYPE + CASE WHEN CHARACTER_MAXIMUM_LENGTH IS NULL THEN ''
                           WHEN CHARACTER_MAXIMUM_LENGTH = -1 THEN '(MAX)'
                           ELSE '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS NVARCHAR(10)) + ')' END
    FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Productos' AND COLUMN_NAME = 'id';
    SELECT @tipoAlerta = DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Alertas' AND COLUMN_NAME = 'id';
    SELECT @tipoUsuario = DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'id';

    EXEC (N'CREATE TABLE dbo.Pedidos (
        id               BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Pedidos PRIMARY KEY,
        productoId       ' + @tipoProducto + N' NOT NULL CONSTRAINT FK_Pedidos_Productos FOREIGN KEY REFERENCES dbo.Productos (id),
        proveedorId      INT          NOT NULL CONSTRAINT FK_Pedidos_Proveedores FOREIGN KEY REFERENCES dbo.Proveedores (id),
        cantidad         INT          NOT NULL CONSTRAINT CK_Pedidos_cantidad CHECK (cantidad > 0),
        cantidadRecibida INT          NULL     CONSTRAINT CK_Pedidos_cantidadRecibida CHECK (cantidadRecibida IS NULL OR cantidadRecibida > 0),
        estado           NVARCHAR(10) NOT NULL CONSTRAINT CK_Pedidos_estado CHECK (estado IN (''SOLICITADO'', ''RECIBIDO'', ''CANCELADO'')),
        correoEnviado    BIT          NOT NULL CONSTRAINT DF_Pedidos_correoEnviado DEFAULT 0,
        alertaId         ' + @tipoAlerta + N' NULL CONSTRAINT FK_Pedidos_Alertas FOREIGN KEY REFERENCES dbo.Alertas (id),
        usuarioId        ' + @tipoUsuario + N' NOT NULL CONSTRAINT FK_Pedidos_Usuarios FOREIGN KEY REFERENCES dbo.Usuarios (id),
        fechaSolicitud   DATETIME2    NOT NULL,
        fechaRecepcion   DATETIME2    NULL
    )');
END
GO

-- Solo un pedido SOLICITADO por producto (la API también lo revisa y responde 409).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Pedidos_producto_solicitado')
    CREATE UNIQUE INDEX UX_Pedidos_producto_solicitado ON dbo.Pedidos (productoId) WHERE estado = 'SOLICITADO';
GO

-- 4) Movimientos: permitir el origen PEDIDO (entrada al recibir un pedido).
--    Se borra el CHECK viejo de origen (el que menciona MANUAL y no PEDIDO) y se crea uno nuevo.
DECLARE @ck SYSNAME;
WHILE 1 = 1
BEGIN
    SET @ck = NULL;
    SELECT TOP 1 @ck = name FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Movimientos')
      AND definition LIKE '%MANUAL%' AND definition NOT LIKE '%PEDIDO%';
    IF @ck IS NULL BREAK;
    EXEC (N'ALTER TABLE dbo.Movimientos DROP CONSTRAINT ' + @ck);
END

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE parent_object_id = OBJECT_ID('dbo.Movimientos') AND definition LIKE '%PEDIDO%')
    ALTER TABLE dbo.Movimientos ADD CONSTRAINT CK_Movimientos_origen
        CHECK (origen IN ('SENSOR', 'CAMARA', 'MANUAL', 'PEDIDO'));
GO

-- 5) Proveedor de prueba. CAMBIAR el correo por uno tuyo para recibir el pedido en la prueba.
--    Cuando esté la lista final de productos, se reemplaza con los proveedores reales.
IF NOT EXISTS (SELECT 1 FROM dbo.Proveedores)
    INSERT INTO dbo.Proveedores (nombre, email, telefono, direccion, lat, lon)
    VALUES ('Proveedor de prueba', 'CAMBIAR_POR_TU_CORREO@ejemplo.com', NULL,
            'Aguascalientes, Ags.', 21.880000, -102.290000);
GO

-- Asignar el proveedor a los productos activos que no tengan uno.
UPDATE dbo.Productos
SET proveedorId = (SELECT MIN(id) FROM dbo.Proveedores)
WHERE proveedorId IS NULL AND activo = 1;
GO

-- 6) Revisión
SELECT id, nombre, email FROM dbo.Proveedores;
SELECT id, nombre, proveedorId FROM dbo.Productos WHERE activo = 1 ORDER BY id;
SELECT cc.name, cc.definition FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID('dbo.Movimientos');
