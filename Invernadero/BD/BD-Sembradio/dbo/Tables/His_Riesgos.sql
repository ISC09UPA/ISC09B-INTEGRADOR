CREATE TABLE [dbo].[His_Riesgos] (
    [id_Historial]   INT        IDENTITY (1, 1) NOT NULL,
    [id_Maceta]      INT        NOT NULL,
    [id_Actuador]    INT        NOT NULL,
    [duracion_Seg]   FLOAT (53) NOT NULL,
    [disparador_Por] BIT        NOT NULL,
    [fecha_R_hora]   DATETIME   NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Historial] ASC),
    FOREIGN KEY ([id_Actuador]) REFERENCES [dbo].[Actuadores] ([id_Actuador]),
    FOREIGN KEY ([id_Maceta]) REFERENCES [dbo].[Maceta] ([id_Maceta])
);

