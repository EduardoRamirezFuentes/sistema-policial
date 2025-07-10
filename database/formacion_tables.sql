-- Crear la tabla de formación
CREATE TABLE IF NOT EXISTS formacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso VARCHAR(255) NOT NULL,
    tipo_curso VARCHAR(100) NOT NULL,
    institucion VARCHAR(255) NOT NULL,
    fecha_curso DATE NOT NULL,
    resultado VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_registro VARCHAR(100) DEFAULT 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear la tabla de competencias básicas
CREATE TABLE IF NOT EXISTS competencias_basicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    institucion VARCHAR(255) NOT NULL,
    resultado VARCHAR(255) NOT NULL,
    vigencia DATE NOT NULL,
    enlace_constancia VARCHAR(500) NULL,
    ruta_archivo VARCHAR(500) NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_registro VARCHAR(100) DEFAULT 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX idx_formacion_fecha ON formacion (fecha_curso);
CREATE INDEX idx_competencias_fecha ON competencias_basicas (fecha);
CREATE INDEX idx_competencias_vigencia ON competencias_basicas (vigencia);
