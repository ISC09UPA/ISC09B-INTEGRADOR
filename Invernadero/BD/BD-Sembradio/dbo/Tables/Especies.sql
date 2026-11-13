CREATE TABLE [dbo].[Especies] (
    [id_Planta] INT            IDENTITY (1, 1) NOT NULL,
    [nombre]    NVARCHAR (255) NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Planta] ASC)
);

