-- Users and Roles --

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

--------

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
