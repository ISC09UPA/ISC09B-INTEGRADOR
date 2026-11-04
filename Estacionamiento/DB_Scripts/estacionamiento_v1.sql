
CREATE TABLE Usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    correo NVARCHAR(150) NOT NULL UNIQUE,          
    contrasena_hash NVARCHAR(255) NOT NULL,        
    rol NVARCHAR(20) NOT NULL
        CHECK (rol IN ('administrador', 'usuario'))
);

CREATE TABLE Vehiculos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    placa NVARCHAR(20) NOT NULL UNIQUE,            
    tipo_vehiculo NVARCHAR(50) NULL,
    id_usuario INT NULL REFERENCES Usuarios(id),   
    estado NVARCHAR(10) NOT NULL DEFAULT 'alta'
        CHECK (estado IN ('alta', 'baja'))         
);


CREATE TABLE Cajones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    numero INT NOT NULL UNIQUE,
    estado NVARCHAR(10) NOT NULL DEFAULT 'libre'
        CHECK (estado IN ('libre', 'ocupado'))
);

CREATE INDEX IX_Cajones_estado ON Cajones(estado);  -- COUNT de cajones libres


CREATE TABLE Accesos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_vehiculo INT NOT NULL REFERENCES Vehiculos(id),
    id_cajon INT NULL REFERENCES Cajones(id),
    hora_entrada DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    hora_salida DATETIME2 NULL,
    foto_entrada NVARCHAR(300) NULL,
    foto_salida NVARCHAR(300) NULL,
    CONSTRAINT CK_Accesos_horas
        CHECK (hora_salida IS NULL OR hora_salida >= hora_entrada)
);


CREATE UNIQUE INDEX UX_Accesos_entrada_abierta
    ON Accesos(id_vehiculo) WHERE hora_salida IS NULL;

CREATE UNIQUE INDEX UX_Accesos_cajon_ocupado
    ON Accesos(id_cajon) WHERE hora_salida IS NULL AND id_cajon IS NOT NULL;


CREATE INDEX IX_Accesos_vehiculo_entrada ON Accesos(id_vehiculo, hora_entrada DESC);


CREATE INDEX IX_Accesos_hora_entrada ON Accesos(hora_entrada) INCLUDE (hora_salida, id_cajon);


CREATE TABLE EventosSensor (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dispositivo NVARCHAR(50) NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    valor NVARCHAR(100) NULL,
    fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    id_cajon INT NULL REFERENCES Cajones(id)      
);


CREATE INDEX IX_EventosSensor_dispositivo_fecha ON EventosSensor(dispositivo, fecha DESC);

CREATE TABLE Alertas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tipo NVARCHAR(30) NOT NULL
        CHECK (tipo IN ('placa_no_registrada', 'vehiculo_baja', 'sin_cajones',
                        'sensor_falla', 'estancia_prolongada')),
    mensaje NVARCHAR(255) NOT NULL,
    fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    atendida BIT NOT NULL DEFAULT 0,
    id_cajon INT NULL REFERENCES Cajones(id),
    id_vehiculo INT NULL REFERENCES Vehiculos(id),
    id_usuario_atiende INT NULL REFERENCES Usuarios(id),

    CONSTRAINT CK_Alertas_atendida
        CHECK (atendida = 0 OR id_usuario_atiende IS NOT NULL)
);


CREATE INDEX IX_Alertas_pendientes ON Alertas(fecha DESC) WHERE atendida = 0;

INSERT INTO Cajones (numero) VALUES (1), (2), (3), (4);
