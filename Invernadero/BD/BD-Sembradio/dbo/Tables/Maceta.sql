CREATE TABLE [dbo].[Maceta] (
    [id_Maceta]     INT          IDENTITY (1, 1) NOT NULL,
    [id_Cultivo]    INT          NOT NULL,
    [id_Planta]     INT          NOT NULL,
    [etiqueta]      VARCHAR (50) NOT NULL,
    [Fecha_Siembra] DATE         NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Maceta] ASC),
    FOREIGN KEY ([id_Cultivo]) REFERENCES [dbo].[Cultivos] ([id_Cultivo]),
    FOREIGN KEY ([id_Planta]) REFERENCES [dbo].[Especies] ([id_Planta])
);

