-- Crear la tabla de evaluaciones si no existe
CREATE TABLE IF NOT EXISTS evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_oficial INT NOT NULL,
    tipo_evaluacion VARCHAR(100) NOT NULL,
    fecha_evaluacion DATETIME NOT NULL,
    calificacion DECIMAL(5,2),
    evaluador VARCHAR(255),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (id_oficial) REFERENCES oficiales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
