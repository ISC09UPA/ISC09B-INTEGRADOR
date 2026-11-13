CREATE TABLE [dbo].[Cultivos] (
    [id_Cultivo]  INT            IDENTITY (1, 1) NOT NULL,
    [nombre]      NVARCHAR (100) NOT NULL,
    [humedad_Min] FLOAT (53)     NOT NULL,
    [humedad_Max] FLOAT (53)     NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Cultivo] ASC)
);

