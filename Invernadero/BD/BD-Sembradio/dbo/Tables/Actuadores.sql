CREATE TABLE [dbo].[Actuadores] (
    [id_Actuador]   INT            IDENTITY (1, 1) NOT NULL,
    [nombre]        NVARCHAR (100) NOT NULL,
    [tipo]          NVARCHAR (100) NOT NULL,
    [estado_Actual] NVARCHAR (50)  NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Actuador] ASC)
);

