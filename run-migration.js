const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sistema_policial',
    multipleStatements: true
};

async function runMigration() {
    let connection;
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', '001-add-activo-column.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        console.log('Running migration...');
        await connection.query(migrationSQL);
        
        console.log('Migration completed successfully!');
        
        // Verify the column was added
        const [rows] = await connection.query(
            "SHOW COLUMNS FROM oficiales LIKE 'activo'"
        );
        
        if (rows.length > 0) {
            console.log('Column "activo" exists in the oficiales table');
        } else {
            console.log('Warning: Column "activo" was not added to the oficiales table');
        }
        
    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

runMigration();
