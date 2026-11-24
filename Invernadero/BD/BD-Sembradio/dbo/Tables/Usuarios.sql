CREATE TABLE [dbo].[Usuarios] (
    [id_Usuario]     INT            IDENTITY (1, 1) NOT NULL,
    [correo]         NVARCHAR (255) NOT NULL,
    [contrasena]     NVARCHAR (255) NOT NULL,
    [nombre]         NVARCHAR (255) NOT NULL,
    [fecha_Registro] DATETIME       DEFAULT (getdate()) NOT NULL,
    PRIMARY KEY CLUSTERED ([id_Usuario] ASC),
    CONSTRAINT [CHK_Correo_Valido] CHECK ([correo] like '%_@_%._%')
);

