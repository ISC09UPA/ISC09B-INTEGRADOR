CREATE TABLE [dbo].[Tipo_Sensor] (
    [id_T_Sensor]      INT            IDENTITY (1, 1) NOT NULL,
    [fecha_Despliegue] DATE           NOT NULL,
    [nombre]           NVARCHAR (100) NOT NULL,
    [unidad_Medida]    NVARCHAR (50)  NOT NULL,
    PRIMARY KEY CLUSTERED ([id_T_Sensor] ASC)
);

