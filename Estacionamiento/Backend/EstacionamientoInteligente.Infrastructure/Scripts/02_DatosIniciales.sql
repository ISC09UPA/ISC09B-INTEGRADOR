/* =====================================================================
   Estacionamiento Inteligente · Datos iniciales
   ---------------------------------------------------------------------
   Crea los 4 cajones de la maqueta, todos libres.
   Se puede correr varias veces: solo inserta los que falten.

   El usuario administrador NO se crea aquí, porque su contraseña debe
   guardarse con hash BCrypt. Lo creará el backend al arrancar
   (semilla en Infrastructure/Data), leyendo los datos de la configuración.
   ===================================================================== */

DECLARE @ahora DATETIME2 = SYSUTCDATETIME();

INSERT INTO dbo.Cajones (id, numero, estado, ultimo_cambio)
SELECT NEWID(), n.numero, N'Libre', @ahora
FROM (VALUES (1), (2), (3), (4)) AS n (numero)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Cajones c WHERE c.numero = n.numero);
GO
