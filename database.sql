-- Create the database
CREATE DATABASE IF NOT EXISTS sistema_policial;

-- Use the database
USE sistema_policial;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Insert default admin user (password: admin)
INSERT INTO usuarios (username, password, nombre_completo, email, activo) 
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'admin@sistema.com', TRUE)
ON DUPLICATE KEY UPDATE username = username;

-- Police officers table
CREATE TABLE IF NOT EXISTS oficiales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    curp VARCHAR(18) NOT NULL UNIQUE,
    cuip VARCHAR(20) NOT NULL UNIQUE,
    cup VARCHAR(20) NOT NULL UNIQUE,
    edad INT NOT NULL,
    sexo ENUM('Masculino', 'Femenino', 'Otro') NOT NULL,
    estado_civil ENUM('Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión Libre') NOT NULL,
    area_adscripcion VARCHAR(100) NOT NULL,
    grado VARCHAR(50) NOT NULL,
    cargo_actual VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    escolaridad ENUM('Primaria', 'Secundaria', 'Preparatoria', 'Técnico Superior', 'Licenciatura', 'Maestría', 'Doctorado') NOT NULL,
    telefono_contacto VARCHAR(15) NOT NULL,
    telefono_emergencia VARCHAR(15) NOT NULL,
    funcion TEXT NOT NULL,
    pdf_nombre_archivo VARCHAR(255),
    pdf_tipo VARCHAR(100),
    pdf_tamanio INT,
    pdf_datos LONGBLOB,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_registro INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_registro) REFERENCES usuarios(id)
);

-- Evaluations table
CREATE TABLE IF NOT EXISTS evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_oficial INT NOT NULL,
    tipo_evaluacion VARCHAR(50) NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    calificacion DECIMAL(5,2),
    observaciones TEXT,
    evaluador VARCHAR(100) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_registro INT,
    FOREIGN KEY (id_oficial) REFERENCES oficiales(id),
    FOREIGN KEY (usuario_registro) REFERENCES usuarios(id)
);

-- Create an index for faster searches on officer names
CREATE INDEX idx_oficial_nombre ON oficiales(nombre_completo);

-- Create a view for officer reports
CREATE OR REPLACE VIEW vista_oficiales AS
SELECT 
    id,
    nombre_completo,
    curp,
    cuip,
    cup,
    edad,
    sexo,
    estado_civil,
    area_adscripcion,
    grado,
    cargo_actual,
    fecha_ingreso,
    escolaridad,
    telefono_contacto,
    telefono_emergencia,
    funcion,
    fecha_registro
FROM oficiales
WHERE activo = TRUE;

-- Create a stored procedure to search officers
DELIMITER //
CREATE PROCEDURE buscar_oficial(IN termino_busqueda VARCHAR(100))
BEGIN
    SELECT * FROM oficiales 
    WHERE nombre_completo LIKE CONCAT('%', termino_busqueda, '%')
    OR curp LIKE CONCAT('%', termino_busqueda, '%')
    OR cuip LIKE CONCAT('%', termino_busqueda, '%')
    OR cup LIKE CONCAT('%', termino_busqueda, '%')
    ORDER BY nombre_completo;
END //
DELIMITER ;

-- Create a trigger to log officer updates
DELIMITER //
CREATE TRIGGER before_oficial_update
BEFORE UPDATE ON oficiales
FOR EACH ROW
BEGIN
    IF OLD.activo = TRUE AND NEW.activo = FALSE THEN
        SET NEW.fecha_baja = CURRENT_TIMESTAMP;
    END IF;
END //
DELIMITER ;

-- Create a user for the application with limited privileges
CREATE USER IF NOT EXISTS 'app_policial'@'localhost' IDENTIFIED BY 'app_policial_123';
GRANT SELECT, INSERT, UPDATE ON sistema_policial.* TO 'app_policial'@'localhost';
FLUSH PRIVILEGES;
