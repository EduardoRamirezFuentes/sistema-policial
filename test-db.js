const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:wnwX96YVvGqhXghRH2hCdfHQFGn82nm8@dpg-d1o234odl3ps73fn3v4g-a.oregon-postgres.render.com:5432/sistema_policial',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');
    const res = await client.query('SELECT NOW()');
    console.log('Hora actual de la base de datos:', res.rows[0].now);
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
