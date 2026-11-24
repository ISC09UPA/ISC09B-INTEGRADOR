CREATE TABLE [dbo].[Sensores] (
    [id_Sensor]       INT          IDENTITY (1, 1) NOT NULL,
    [id_T_Sensor]     INT          NOT NULL,
    [id_Maceta]       INT          NOT NULL,
    [codigo_hardware] VARCHAR (50) NOT NULL,
    [estado]          DATE         NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Sensor] ASC),
    FOREIGN KEY ([id_Maceta]) REFERENCES [dbo].[Maceta] ([id_Maceta]),
    FOREIGN KEY ([id_T_Sensor]) REFERENCES [dbo].[Tipo_Sensor] ([id_T_Sensor])
);

