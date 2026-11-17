-- Almacén Inteligente · Cambio 002 · 17 nov 2026
-- Ejecutar en el Query editor de db-almacen ANTES de correr las Azure Functions.
-- Crea la bitácora de lecturas de la Raspberry. Se puede ejecutar más de una vez sin problema.

IF OBJECT_ID('dbo.LecturasDispositivo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LecturasDispositivo (
        lecturaId     NVARCHAR(64)  NOT NULL CONSTRAINT PK_LecturasDispositivo PRIMARY KEY,
        dispositivoId NVARCHAR(50)  NOT NULL,
        espacioId     NVARCHAR(10)  NOT NULL,
        tipoSensor    NVARCHAR(10)  NOT NULL CONSTRAINT CK_LecturasDispositivo_tipo CHECK (tipoSensor IN ('IR', 'PESO')),
        evento        NVARCHAR(10)  NULL     CONSTRAINT CK_LecturasDispositivo_evento CHECK (evento IN ('ENTRADA', 'SALIDA')),
        cantidad      INT           NULL,
        pesoGramos    INT           NULL,
        fechaHora     DATETIME2     NOT NULL,
        procesadaEn   DATETIME2     NOT NULL,
        resultado     NVARCHAR(200) NOT NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LecturasDispositivo_espacio_fecha')
    CREATE INDEX IX_LecturasDispositivo_espacio_fecha ON dbo.LecturasDispositivo (espacioId, fechaHora);
GO

SELECT COUNT(*) AS lecturasRegistradas FROM dbo.LecturasDispositivo;
