const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

async function initializeDatabase() {
  try {
    // Leer el archivo SQL
    const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    
    // Configuración de la base de datos desde variables de entorno
    const dbConfig = {
      host: process.env.RENDER_DB_HOST || process.env.DB_HOST,
      user: process.env.RENDER_DB_USER || process.env.DB_USER,
      password: process.env.RENDER_DB_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.RENDER_DB_NAME || process.env.DB_NAME,
      port: process.env.RENDER_DB_PORT || process.env.DB_PORT || 3306,
      multipleStatements: true // Permite ejecutar múltiples sentencias SQL
    };

    console.log('Conectando a la base de datos...');
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('Ejecutando script SQL...');
    await connection.query(sql);
    
    console.log('Base de datos inicializada correctamente');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar la base de datos:');
    console.error(error);
    process.exit(1);
  }
}

initializeDatabase();
