SET NAMES utf8mb4;
-- Consultorio Inteligente · base de datos local (MySQL / MariaDB)
-- Uso: mysql -u root -p < consultorio_inteligente.sql

DROP DATABASE IF EXISTS consultorio_inteligente;
CREATE DATABASE consultorio_inteligente CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE consultorio_inteligente;

-- ---------- Usuarios y roles ----------
CREATE TABLE roles (
  id     TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
  id            INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  correo        VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  rol_id        TINYINT UNSIGNED NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

CREATE TABLE consultorios (
  id     TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL
);

CREATE TABLE doctores (
  usuario_id     INT UNSIGNED PRIMARY KEY,
  consultorio_id TINYINT UNSIGNED NOT NULL,
  especialidad   VARCHAR(60),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (consultorio_id) REFERENCES consultorios(id)
);

-- ---------- Control de acceso (RFID + sensor de presencia) ----------
CREATE TABLE tags_rfid (
  id         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  uid        VARCHAR(23) NOT NULL UNIQUE,
  usuario_id INT UNSIGNED NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE accesos (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tag_id       INT UNSIGNED NULL,
  uid_leido    VARCHAR(23) NOT NULL,
  usuario_id   INT UNSIGNED NULL,
  presencia    BOOLEAN NOT NULL,
  resultado    ENUM('concedido','denegado') NOT NULL,
  motivo       VARCHAR(60) NULL,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sincronizado BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX idx_accesos_fecha (creado_en),
  FOREIGN KEY (tag_id) REFERENCES tags_rfid(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ---------- Citas y turnos ----------
CREATE TABLE citas (
  id             INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  paciente_id    INT UNSIGNED NOT NULL,
  doctor_id      INT UNSIGNED NOT NULL,
  consultorio_id TINYINT UNSIGNED NOT NULL,
  fecha_hora     DATETIME NOT NULL,
  estado         ENUM('agendada','cancelada','atendida') NOT NULL DEFAULT 'agendada',
  FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
  FOREIGN KEY (doctor_id) REFERENCES doctores(usuario_id),
  FOREIGN KEY (consultorio_id) REFERENCES consultorios(id)
);

CREATE TABLE turnos (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  codigo          VARCHAR(8) NOT NULL,
  cita_id         INT UNSIGNED NULL,
  paciente_id     INT UNSIGNED NOT NULL,
  consultorio_id  TINYINT UNSIGNED NOT NULL,
  estado          ENUM('en_espera','llamado','en_consulta','finalizado') NOT NULL DEFAULT 'en_espera',
  llegada_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  llamado_en      DATETIME NULL,
  inicio_consulta DATETIME NULL,
  fin_consulta    DATETIME NULL,
  FOREIGN KEY (cita_id) REFERENCES citas(id),
  FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
  FOREIGN KEY (consultorio_id) REFERENCES consultorios(id)
);

-- ---------- Sala de espera (cámara + Computer Vision) ----------
CREATE TABLE ocupacion_sala (
  id        INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  foto_url  VARCHAR(255) NULL,
  personas  TINYINT UNSIGNED NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE configuracion (
  clave VARCHAR(40) PRIMARY KEY,
  valor VARCHAR(100) NOT NULL
);

CREATE TABLE alertas (
  id        INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tipo      ENUM('acceso_denegado','sala_llena') NOT NULL,
  mensaje   VARCHAR(200) NOT NULL,
  acceso_id BIGINT UNSIGNED NULL,
  leida     BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (acceso_id) REFERENCES accesos(id)
);

-- ---------- Cola local para sincronizar con Azure (modo sin internet) ----------
CREATE TABLE eventos_pendientes (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tipo       VARCHAR(30) NOT NULL,
  payload    JSON NOT NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_en DATETIME NULL,
  intentos   TINYINT UNSIGNED NOT NULL DEFAULT 0
);

-- ---------- Triggers: alertas automáticas ----------
DELIMITER $$
CREATE TRIGGER trg_acceso_denegado AFTER INSERT ON accesos
FOR EACH ROW
BEGIN
  IF NEW.resultado = 'denegado' THEN
    INSERT INTO alertas (tipo, mensaje, acceso_id)
    VALUES ('acceso_denegado', CONCAT('Acceso denegado · ', NEW.uid_leido, ' · ', IFNULL(NEW.motivo, '')), NEW.id);
  END IF;
END$$

CREATE TRIGGER trg_sala_llena AFTER INSERT ON ocupacion_sala
FOR EACH ROW
BEGIN
  DECLARE cap INT;
  SELECT CAST(valor AS UNSIGNED) INTO cap FROM configuracion WHERE clave = 'capacidad_sala';
  IF NEW.personas > cap THEN
    INSERT INTO alertas (tipo, mensaje)
    VALUES ('sala_llena', CONCAT('Sala llena · ', NEW.personas, ' personas (capacidad ', cap, ')'));
  END IF;
END$$
DELIMITER ;

-- ---------- Vistas para el panel del administrador ----------
CREATE VIEW v_fila_actual AS
SELECT t.codigo, u.nombre AS paciente, c.nombre AS consultorio, t.estado
FROM turnos t
JOIN usuarios u ON u.id = t.paciente_id
JOIN consultorios c ON c.id = t.consultorio_id
WHERE t.estado IN ('en_espera','llamado','en_consulta')
ORDER BY t.id;

CREATE VIEW v_visitas_por_hora AS
SELECT DATE(creado_en) AS fecha, HOUR(creado_en) AS hora, COUNT(*) AS visitas
FROM accesos WHERE resultado = 'concedido'
GROUP BY DATE(creado_en), HOUR(creado_en);

CREATE VIEW v_espera_promedio AS
SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, llegada_en, llamado_en)), 1) AS minutos
FROM turnos WHERE llamado_en IS NOT NULL;

CREATE VIEW v_resumen_accesos AS
SELECT resultado, COUNT(*) AS total FROM accesos GROUP BY resultado;

-- ---------- Datos de ejemplo ----------
INSERT INTO configuracion VALUES ('capacidad_sala', '8');
INSERT INTO roles (nombre) VALUES ('admin'), ('doctor'), ('paciente');
INSERT INTO consultorios (nombre) VALUES ('Consultorio 1');

INSERT INTO usuarios (nombre, correo, password_hash, rol_id) VALUES
 ('Administrador',   'admin@demo.com',    '$2b$11$I5vKwjStbAivKbvN/vbS5uv7pzI3UZ1aquQOnYgqw2Zp0fRYq9nkS', 1),
 ('Dra. Ana Torres', 'doctor@demo.com',   '$2b$11$I5vKwjStbAivKbvN/vbS5uv7pzI3UZ1aquQOnYgqw2Zp0fRYq9nkS', 2),
 ('María López',     'paciente@demo.com', '$2b$11$I5vKwjStbAivKbvN/vbS5uv7pzI3UZ1aquQOnYgqw2Zp0fRYq9nkS', 3),
 ('Jorge Ramos',     'jorge@demo.com',    '$2b$11$I5vKwjStbAivKbvN/vbS5uv7pzI3UZ1aquQOnYgqw2Zp0fRYq9nkS', 3),
 ('Elena Cruz',      'elena@demo.com',    '$2b$11$I5vKwjStbAivKbvN/vbS5uv7pzI3UZ1aquQOnYgqw2Zp0fRYq9nkS', 3);

INSERT INTO doctores VALUES (2, 1, 'Medicina general');

INSERT INTO tags_rfid (uid, usuario_id) VALUES
 ('7C:11:90:A1', 2), ('9D:42:E7:03', 3), ('3B:F0:22:5E', 4), ('5A:19:C4:77', 5);

INSERT INTO accesos (tag_id, uid_leido, usuario_id, presencia, resultado, motivo, creado_en) VALUES
 (1, '7C:11:90:A1', 2,    TRUE,  'concedido', NULL,                     TIMESTAMP(CURDATE(), '08:05:00')),
 (3, '3B:F0:22:5E', 4,    TRUE,  'concedido', NULL,                     TIMESTAMP(CURDATE(), '09:12:00')),
 (4, '5A:19:C4:77', 5,    TRUE,  'concedido', NULL,                     TIMESTAMP(CURDATE(), '09:20:00')),
 (2, '9D:42:E7:03', 3,    TRUE,  'concedido', NULL,                     TIMESTAMP(CURDATE(), '10:02:00')),
 (NULL, '04:A2:1F:00', NULL, TRUE, 'denegado', 'tag no registrado',     TIMESTAMP(CURDATE(), '09:38:00')),
 (2, '9D:42:E7:03', 3,    FALSE, 'denegado', 'sin presencia detectada', TIMESTAMP(CURDATE(), '10:00:00'));

INSERT INTO citas (paciente_id, doctor_id, consultorio_id, fecha_hora) VALUES
 (3, 2, 1, TIMESTAMP(CURDATE(), '09:30:00')),
 (4, 2, 1, TIMESTAMP(CURDATE(), '09:45:00')),
 (5, 2, 1, TIMESTAMP(CURDATE(), '10:00:00'));

INSERT INTO turnos (codigo, cita_id, paciente_id, consultorio_id, estado, llegada_en, llamado_en, inicio_consulta) VALUES
 ('A-014', 2, 4, 1, 'en_consulta', TIMESTAMP(CURDATE(), '09:12:00'), TIMESTAMP(CURDATE(), '09:25:00'), TIMESTAMP(CURDATE(), '09:27:00')),
 ('A-015', 3, 5, 1, 'en_espera',   TIMESTAMP(CURDATE(), '09:20:00'), NULL, NULL),
 ('A-016', 1, 3, 1, 'en_espera',   TIMESTAMP(CURDATE(), '10:02:00'), NULL, NULL);

INSERT INTO ocupacion_sala (foto_url, personas, creado_en) VALUES
 ('blob://sala/foto_0900.jpg', 3,  TIMESTAMP(CURDATE(), '09:00:00')),
 ('blob://sala/foto_0930.jpg', 5,  TIMESTAMP(CURDATE(), '09:30:00')),
 ('blob://sala/foto_1000.jpg', 9,  TIMESTAMP(CURDATE(), '10:00:00'));

INSERT INTO eventos_pendientes (tipo, payload) VALUES
 ('acceso', JSON_OBJECT('uid', '04:A2:1F:00', 'resultado', 'denegado')),
 ('ocupacion', JSON_OBJECT('personas', 9));
