CREATE TABLE [dbo].[Lectura] (
    [id_Lectura]   INT        IDENTITY (1, 1) NOT NULL,
    [id_Sensor]    INT        NOT NULL,
    [valor]        FLOAT (53) NOT NULL,
    [fecha_L_Hora] DATETIME   NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Lectura] ASC),
    FOREIGN KEY ([id_Sensor]) REFERENCES [dbo].[Sensores] ([id_Sensor])
);

