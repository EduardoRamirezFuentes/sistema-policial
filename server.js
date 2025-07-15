const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

// Cargar variables de entorno
require('dotenv').config();

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:wnwX96YVvGqhXghRH2hCdfHQFGn82nm8@dpg-d1o234odl3ps73fn3v4g-a.oregon-postgres.render.com:5432/sistema_policial',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  min: 0,
  acquireTimeoutMillis: 10000,
  timeout: 10000
});

// Verificar conexión a la base de datos
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');
    client.release();
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    console.log('ℹ️ Verifica que la variable DATABASE_URL esté correctamente configurada en Render');
    console.log('ℹ️ DATABASE_URL actual:', process.env.DATABASE_URL ? '***configurada***' : 'no configurada');
  }
};

testConnection();

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB
});

// Configuración de CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (origin === undefined || origin === null) {
      callback(null, true);
    } else if (origin.startsWith('http://localhost:') || 
              origin.startsWith('https://sistema-policial.onrender.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para guardar un nuevo oficial
app.post('/api/oficiales', upload.single('pdfFile'), async (req, res) => {
    console.log('Solicitud POST recibida en /api/oficiales');
    console.log('Cuerpo de la solicitud (body):', req.body);
    console.log('Archivo adjunto:', req.file);
    
    try {
        const client = await pool.connect();
        await client.query('BEGIN');
        
        // Verificar conexión a la base de datos
        const testResult = await client.query('SELECT 1 as test');
        console.log('Conexión a la base de datos exitosa:', testResult.rows[0]);

        
        // Validar campos requeridos
        const camposRequeridos = [
            'nombreCompleto', 'curp', 'cuip', 'cup', 'edad', 'sexo', 'estadoCivil',
            'areaAdscripcion', 'grado', 'cargoActual', 'fechaIngreso',
            'escolaridad', 'telefonoContacto', 'telefonoEmergencia', 'funcion'
        ];

        const camposFaltantes = [];
        for (const campo of camposRequeridos) {
            if (!req.body[campo]) {
                camposFaltantes.push(campo);
            }
        }

        if (camposFaltantes.length > 0) {
            throw new Error(`Faltan campos requeridos: ${camposFaltantes.join(', ')}`);
        }

        // Validar longitud de campos
        if (req.body.curp.length !== 18) {
            throw new Error('La CURP debe tener 18 caracteres');
        }

        // Validar que la edad sea un número válido
        const edad = parseInt(req.body.edad);
        if (isNaN(edad) || edad < 18 || edad > 100) {
            throw new Error('La edad debe ser un número entre 18 y 100');
        }

        // Validar formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.fechaIngreso)) {
            throw new Error('El formato de fecha debe ser YYYY-MM-DD');
        }

        // Verificar si ya existe un oficial con el mismo CURP, CUIP o CUP
        const existeOficial = await client.query(
            'SELECT id FROM oficiales WHERE curp = $1 OR cuip = $2 OR cup = $3',
            [req.body.curp, req.body.cuip, req.body.cup]
        );

        if (existeOficial.rows.length > 0) {
            throw new Error('Ya existe un oficial con el mismo CURP, CUIP o CUP');
        }

        // Insertar el nuevo oficial en la base de datos
        const result = await client.query(
            `INSERT INTO oficiales (
                nombre_completo, curp, cuip, cup, edad, sexo, estado_civil,
                area_adscripcion, grado, cargo_actual, fecha_ingreso,
                escolaridad, telefono_contacto, telefono_emergencia, funcion, ruta_pdf
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            ) RETURNING id`,
            [
                req.body.nombreCompleto, req.body.curp.toUpperCase(), req.body.cuip.toUpperCase(), 
                req.body.cup.toUpperCase(), parseInt(req.body.edad), req.body.sexo, 
                req.body.estadoCivil, req.body.areaAdscripcion, req.body.grado, 
                req.body.cargoActual, req.body.fechaIngreso, req.body.escolaridad, 
                req.body.telefonoContacto, req.body.telefonoEmergencia, req.body.funcion,
                req.file ? path.basename(req.file.path) : null
            ]
        );

        if (!result.rows || result.rows.length === 0) {
            throw new Error('No se pudo obtener el ID del oficial insertado');
        }

        const idOficial = result.rows[0].id;
        console.log('Oficial guardado con ID:', idOficial);
        
        // Si se subió un archivo, moverlo a la carpeta de uploads
        if (req.file) {
            const uploadsDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const oldPath = req.file.path;
            const newPath = path.join(uploadsDir, req.file.filename);
            
            // Mover el archivo temporal a la carpeta de uploads
            fs.renameSync(oldPath, newPath);
            console.log('Archivo guardado en:', newPath);
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({ 
            success: true, 
            message: 'Oficial guardado exitosamente',
            id: idOficial
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        
        console.error('Error al guardar el oficial:');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Eliminar el archivo subido si hubo un error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        // Detalles adicionales del error para depuración
        const errorDetails = {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            position: error.position,
            internalQuery: error.internalQuery,
            where: error.where,
            schema: error.schema,
            table: error.table,
            column: error.column,
            dataType: error.dataType,
            constraint: error.constraint
        };
        
        console.error('Detalles del error de PostgreSQL:', errorDetails);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al guardar el oficial: ' + error.message,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        });
    } finally {
        client.release();
    }
});

// Ruta para obtener todos los registros de formación
app.get('/api/formacion', async (req, res) => {
    const { id_oficial } = req.query;
    let query = 'SELECT f.*, o.nombre_completo AS nombre_oficial FROM formacion f ';
    query += 'LEFT JOIN oficiales o ON f.id_oficial = o.id ';
    
    const params = [];
    let paramCount = 1;
    
    if (id_oficial) {
        query += `WHERE f.id_oficial = $${paramCount} `;
        params.push(id_oficial);
        paramCount++;
    }
    
    query += 'ORDER BY f.fecha_curso DESC';
    
    try {
        const client = await pool.connect();
        
        try {
            const result = await client.query(query, params);
            
            // Formatear fechas para mostrarlas correctamente
            const formacionFormateada = result.rows.map(form => ({
                ...form,
                fecha_inicio: form.fecha_inicio ? new Date(form.fecha_inicio).toISOString().split('T')[0] : null,
                fecha_fin: form.fecha_fin ? new Date(form.fecha_fin).toISOString().split('T')[0] : null,
                fecha_registro: form.fecha_registro ? new Date(form.fecha_registro).toISOString() : null
            }));
            
            res.json({
                success: true,
                data: formacionFormateada
            });
            
        } catch (error) {
            console.error('Error al obtener la formación:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la formación',
                error: error.message
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al conectar a la base de datos',
            error: error.message
        });
    }
});

// Ruta para obtener competencias básicas
app.get('/api/competencias', async (req, res) => {
    const { id_oficial } = req.query;
    let query = 'SELECT c.*, o.nombre_completo AS nombre_oficial FROM competencias_basicas c ';
    query += 'LEFT JOIN oficiales o ON c.id_oficial = o.id ';
    
    const params = [];
    let paramCount = 1;
    
    if (id_oficial) {
        query += `WHERE c.id_oficial = $${paramCount} `;
        params.push(id_oficial);
        paramCount++;
    }
    
    query += 'ORDER BY c.fecha DESC';
    
    try {
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener las competencias básicas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las competencias básicas',
            error: error.message 
        });
    }
});

// Ruta para guardar una competencia básica
app.post('/api/competencias', upload.single('archivo_pdf'), async (req, res) => {
    const competencia = req.body;
    const archivo = req.file;
    let connection;
    
    // Validar que se haya proporcionado el ID del oficial
    if (!competencia.id_oficial) {
        return res.status(400).json({ 
            success: false, 
            message: 'El ID del oficial es requerido' 
        });
    }
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar que el oficial exista
        const [oficial] = await connection.query(
            'SELECT id FROM oficiales WHERE id = ?',
            [competencia.id_oficial]
        );
        
        if (oficial.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'El oficial especificado no existe' 
            });
        }
        
        // Guardar el archivo si se proporcionó
        let rutaArchivo = null;
        if (archivo) {
            rutaArchivo = `/uploads/${archivo.filename}`;
        }
        
        // Insertar la competencia en la base de datos
        const [result] = await connection.query(
            'INSERT INTO competencias_basicas (id_oficial, fecha, institucion, resultado, vigencia, enlace_constancia, ruta_archivo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                competencia.id_oficial,
                competencia.fecha_competencia,
                competencia.institucion_competencia,
                competencia.resultado_competencia,
                competencia.vigencia,
                competencia.enlace_constancia || null,
                rutaArchivo
            ]
        );
        
        await connection.commit();
        res.status(201).json({ 
            success: true, 
            message: 'Competencia básica guardada exitosamente',
            id: result.insertId 
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al guardar la competencia básica:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al guardar la competencia básica',
            error: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para obtener las evaluaciones
app.get('/api/evaluaciones', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, o.nombre_completo as nombre_oficial,
                    'Sistema' as nombre_usuario
             FROM evaluaciones e
             JOIN oficiales o ON e.id_oficial = o.id
             ORDER BY e.fecha_evaluacion DESC, e.fecha_registro DESC`
        );
        
        // Formatear fechas para mostrarlas correctamente
        const evaluacionesFormateadas = result.rows.map(eval => ({
            ...eval,
            fecha_evaluacion: eval.fecha_evaluacion ? new Date(eval.fecha_evaluacion).toISOString().split('T')[0] : null,
            fecha_registro: eval.fecha_registro ? new Date(eval.fecha_registro).toISOString() : null
        }));
        
        res.json({
            success: true,
            data: evaluacionesFormateadas
        });
        
    } catch (error) {
        console.error('Error al obtener las evaluaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las evaluaciones',
            error: error.message
        });
    }
});

// Ruta para crear una nueva evaluación
app.post('/api/evaluaciones', async (req, res) => {
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Validar datos requeridos
            const camposRequeridos = ['id_oficial', 'tipo_evaluacion', 'fecha_evaluacion', 'evaluador'];
            const camposFaltantes = camposRequeridos.filter(campo => !req.body[campo]);
            
            if (camposFaltantes.length > 0) {
                throw new Error(`Faltan campos requeridos: ${camposFaltantes.join(', ')}`);
            }
            
            // Validar formato de fecha
            const fecha = new Date(req.body.fecha_evaluacion);
            if (isNaN(fecha.getTime())) {
                throw new Error('Formato de fecha inválido');
            }
            
            // Validar calificación si se proporciona
            if (req.body.calificacion !== undefined) {
                const calificacion = parseFloat(req.body.calificacion);
                if (isNaN(calificacion) || calificacion < 0 || calificacion > 100) {
                    throw new Error('La calificación debe ser un número entre 0 y 100');
                }
            }
            
            // Insertar la evaluación
            const result = await client.query(
                `INSERT INTO evaluaciones (
                    id_oficial, tipo_evaluacion, fecha_evaluacion, calificacion, 
                    evaluador, observaciones, fecha_registro, usuario_registro
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
                RETURNING id`,
                [
                    req.body.id_oficial,
                    req.body.tipo_evaluacion,
                    req.body.fecha_evaluacion,
                    req.body.calificacion ? parseFloat(req.body.calificacion) : null,
                    req.body.evaluador,
                    req.body.observaciones || null,
                    1
                ]
            );
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                message: 'Evaluación guardada correctamente',
                data: { id: result.rows[0].id }
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error al guardar la evaluación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar la evaluación',
            error: error.message
        });
    }
});

// Ruta para obtener estadísticas de oficiales
app.get('/api/estadisticas', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Obtener el número de oficiales activos
        const activosResult = await client.query('SELECT COUNT(*) FROM oficiales WHERE activo = TRUE');
        const activos = parseInt(activosResult.rows[0].count);
        console.log('Oficiales activos:', activos);
        
        // Obtener el número de oficiales inactivos
        const inactivosResult = await client.query('SELECT COUNT(*) FROM oficiales WHERE activo = FALSE');
        const inactivos = parseInt(inactivosResult.rows[0].count);
        console.log('Oficiales inactivos:', inactivos);
        
        // Confirmar la transacción
        await client.query('COMMIT');
        
        const result = {
            activos: activos,
            inactivos: inactivos,
            total: activos + inactivos
        };
        
        console.log('Enviando respuesta:', result);
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        // Revertir la transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al obtener estadísticas de oficiales:');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas de oficiales',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                code: error.code,
                detail: error.detail,
                hint: error.hint,
                position: error.position,
                internalPosition: error.internalPosition,
                internalQuery: error.internalQuery,
                where: error.where,
                schema: error.schema,
                table: error.table,
                column: error.column,
                dataType: error.dataType,
                constraint: error.constraint,
                file: error.file,
                line: error.line,
                routine: error.routine
            } : undefined
        });
    } finally {
        // Liberar el cliente de vuelta al pool
        client.release();
        console.log('Conexión a la base de datos liberada');
    }
});

// Ruta para buscar oficiales
app.get('/api/oficiales/buscar', async (req, res) => {
    const { termino } = req.query;
    
    if (!termino) {
        return res.status(400).json({ 
            success: false, 
            message: 'Término de búsqueda requerido' 
        });
    }
    
    const searchTerm = `%${termino}%`;
    
    try {
        const result = await pool.query(
            `SELECT id, nombre_completo, curp, cuip, cup, grado, cargo_actual 
             FROM oficiales 
             WHERE nombre_completo ILIKE $1 
                OR curp ILIKE $1 
                OR cuip ILIKE $1 
                OR cup ILIKE $1 
                OR cargo_actual ILIKE $1 
             ORDER BY nombre_completo 
             LIMIT 50`,
            [searchTerm]
        );
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al buscar oficiales:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al buscar oficiales',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});

// Ruta de prueba de conexión
app.get('/api/test', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT 1 as test');
        client.release();
        res.json({ 
            success: true, 
            message: 'Conexión exitosa a la base de datos', 
            data: result.rows 
        });
    } catch (error) {
        console.error('Error en la conexión a la base de datos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al conectar con la base de datos', 
            error: error.message 
        });
    }
});

// Ruta para manejar todas las demás rutas y servir index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            console.error('Error al enviar index.html:', err);
            res.status(500).send('Error al cargar la aplicación');
        }
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error global:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log('Credenciales de acceso:');
    console.log('Usuario: admin');
    console.log('Contraseña: admin');
    console.log('\nRutas disponibles:');
    console.log(`- POST /api/oficiales - Guardar un nuevo oficial`);
    console.log(`- GET /api/oficiales/buscar?termino= - Buscar oficiales`);
    console.log(`- GET /api/test - Probar conexión con la base de datos`);
    console.log(`- GET /api/evaluaciones - Obtener todas las evaluaciones`);
    console.log(`- POST /api/evaluaciones - Crear una nueva evaluación`);
    console.log(`- GET /api/estadisticas - Obtener estadísticas de oficiales`);
});
