-- Asegurarse de que la base de datos existe
CREATE DATABASE IF NOT EXISTS sistema_policial;
USE sistema_policial;

-- Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Insertar o actualizar el usuario admin
-- La contraseña es 'admin' hasheada con SHA-256
INSERT INTO usuarios (username, password, nombre_completo, email, activo) 
VALUES ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Administrador', 'admin@sistema.com', TRUE)
ON DUPLICATE KEY UPDATE 
    password = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    activo = TRUE,
    nombre_completo = 'Administrador';

-- Verificar que el usuario se creó correctamente
SELECT * FROM usuarios WHERE username = 'admin';
