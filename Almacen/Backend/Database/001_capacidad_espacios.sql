-- Almacén Inteligente · Cambio 001 · 12 nov 2026
-- Ejecutar en el Query editor de db-almacen ANTES de correr la versión nueva de la API.
-- Se puede ejecutar más de una vez sin problema.
-- IMPORTANTE: los GO separan los lotes. Sin ellos, SQL Server revisa las columnas
-- antes de que se agregue "capacidad" y marca "Invalid column name".

-- 1) Capacidad de cada espacio (piezas máximas). NULL = sin límite.
IF COL_LENGTH('dbo.Espacios', 'capacidad') IS NULL
    ALTER TABLE dbo.Espacios ADD capacidad INT NULL
        CONSTRAINT CK_Espacios_capacidad CHECK (capacidad IS NULL OR capacidad > 0);
GO

-- 2) Anaquel y espacios de la maqueta (3 contenedores). Solo si la tabla Espacios está vacía.
IF NOT EXISTS (SELECT 1 FROM dbo.Espacios)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Anaqueles WHERE id = 'A1')
        INSERT INTO dbo.Anaqueles (id, descripcion) VALUES ('A1', 'Anaquel de la maqueta');

    INSERT INTO dbo.Espacios (id, anaquelId, productoId, taraGramos, existencia, ultimaLectura, capacidad)
    VALUES ('A1-E1', 'A1', NULL, 0, 0, NULL, NULL),
           ('A1-E2', 'A1', NULL, 0, 0, NULL, NULL),
           ('A1-E3', 'A1', NULL, 0, 0, NULL, NULL);
END;
GO

-- 3) Revisión
SELECT id, anaquelId, productoId, existencia, capacidad, taraGramos FROM dbo.Espacios ORDER BY id;
