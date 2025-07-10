const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = 8080;

// Cargar variables de entorno
require('dotenv').config();

// Configuración de la conexión a MySQL
const dbConfig = {
    host: process.env.RENDER_DB_HOST || process.env.DB_HOST,
    user: process.env.RENDER_DB_USER || process.env.DB_USER,
    password: process.env.RENDER_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.RENDER_DB_NAME || process.env.DB_NAME,
    port: process.env.RENDER_DB_PORT || process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Crear el pool de conexiones
const pool = mysql.createPool(dbConfig);

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    extensions: ['html', 'htm']
}));

// Configuración de rutas para archivos estáticos
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));

// Ruta específica para servir la imagen de fondo
app.get('/img/ssc.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'img', 'ssc.png'));
});
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para guardar un nuevo oficial
app.post('/api/oficiales', upload.single('pdfFile'), async (req, res) => {
    console.log('Solicitud POST recibida en /api/oficiales');
    console.log('Cuerpo de la solicitud (body):', req.body);
    console.log('Archivo adjunto:', req.file);
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Verificar conexión a la base de datos
        const [testResult] = await connection.query('SELECT 1 as test');
        console.log('Conexión a la base de datos exitosa:', testResult);
        
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

        // Crear objeto con los datos del oficial
        const oficialData = {
            nombre_completo: req.body.nombreCompleto,
            curp: req.body.curp,
            cuip: req.body.cuip,
            cup: req.body.cup,
            edad: edad,
            sexo: req.body.sexo,
            estado_civil: req.body.estadoCivil,
            area_adscripcion: req.body.areaAdscripcion,
            grado: req.body.grado,
            cargo_actual: req.body.cargoActual,
            fecha_ingreso: req.body.fechaIngreso,
            escolaridad: req.body.escolaridad,
            telefono_contacto: req.body.telefonoContacto.replace(/\D/g, ''), // Solo números
            telefono_emergencia: req.body.telefonoEmergencia.replace(/\D/g, ''), // Solo números
            funcion: req.body.funcion,
            pdf_nombre_archivo: req.file ? req.file.filename : null,
            pdf_tipo: req.file ? req.file.mimetype : null,
            pdf_tamanio: req.file ? req.file.size : null,
            usuario_registro: 1, // ID del usuario administrador
            activo: 1
        };

        console.log('Datos del oficial a insertar:', JSON.stringify(oficialData, null, 2));

        console.log('Datos a insertar en la base de datos:', oficialData);
        
        // Primero verificar si ya existe un registro con la misma CURP, CUIP o CUP
        const [existing] = await connection.query(
            `SELECT id FROM oficiales WHERE curp = ? OR cuip = ? OR cup = ? LIMIT 1`,
            [oficialData.curp, oficialData.cuip, oficialData.cup]
        );

        if (existing && existing.length > 0) {
            throw new Error('Ya existe un registro con la misma CURP, CUIP o CUP');
        }

        // Insertar el nuevo registro
        const [result] = await connection.query('INSERT INTO oficiales SET ?', [oficialData]);
        
        await connection.commit();
        
        console.log('Registro insertado correctamente. ID:', result.insertId);
        
        res.json({ 
            success: true, 
            message: 'Oficial registrado exitosamente',
            id: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al guardar el oficial:');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Mostrar más detalles del error de MySQL si está disponible
        if (error.sql) {
            console.error('Consulta SQL:', error.sql);
            console.error('Código de error:', error.code);
            console.error('Número de error:', error.errno);
        }
        
        // Eliminar el archivo subido si hubo un error
        if (req.file && fs.existsSync(req.file.path)) {
            console.log('Eliminando archivo subido debido al error:', req.file.path);
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al guardar el oficial: ' + error.message,
            error: error.message,
            errorDetails: process.env.NODE_ENV === 'development' ? {
                code: error.code,
                errno: error.errno,
                sql: error.sql
            } : undefined
        });
    } finally {
        connection.release();
    }
});

// Ruta para cargar la página de formación
app.get('/formacion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'formacion.html'));
});

// Ruta para guardar un registro de formación
app.post('/api/formacion', express.json(), async (req, res) => {
    const formacion = req.body;
    let connection;
    
    // Validar que se haya proporcionado el ID del oficial
    if (!formacion.id_oficial) {
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
            [formacion.id_oficial]
        );
        
        if (oficial.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'El oficial especificado no existe' 
            });
        }
        
        // Insertar el registro de formación
        const [result] = await connection.query(
            'INSERT INTO formacion (id_oficial, curso, tipo_curso, institucion, fecha_curso, resultado) VALUES (?, ?, ?, ?, ?, ?)',
            [
                formacion.id_oficial,
                formacion.curso, 
                formacion.tipo_curso, 
                formacion.institucion, 
                formacion.fecha_curso, 
                formacion.resultado_curso
            ]
        );
        
        await connection.commit();
        res.status(201).json({ 
            success: true, 
            message: 'Registro de formación guardado exitosamente',
            id: result.insertId 
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al guardar el registro de formación:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al guardar el registro de formación',
            error: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para obtener todos los registros de formación
app.get('/api/formacion', async (req, res) => {
    const { id_oficial } = req.query;
    let query = 'SELECT f.*, o.nombre_completo AS nombre_oficial FROM formacion f ';
    query += 'LEFT JOIN oficiales o ON f.id_oficial = o.id ';
    
    const params = [];
    
    if (id_oficial) {
        query += 'WHERE f.id_oficial = ? ';
        params.push(id_oficial);
    }
    
    query += 'ORDER BY f.fecha_curso DESC';
    
    try {
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener los registros de formación:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener los registros de formación',
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
    
    if (id_oficial) {
        query += 'WHERE c.id_oficial = ? ';
        params.push(id_oficial);
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

// Ruta para guardar una evaluación
app.post('/api/evaluaciones', express.json(), async (req, res) => {
    const evaluacion = req.body;
    
    // Validar datos de entrada
    if (!evaluacion.id_oficial || !evaluacion.tipo_evaluacion || !evaluacion.fecha_evaluacion || !evaluacion.evaluador) {
        return res.status(400).json({ 
            success: false, 
            message: 'Faltan campos requeridos: id_oficial, tipo_evaluacion, fecha_evaluacion y evaluador son obligatorios' 
        });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Insertar la evaluación en la base de datos
        const [result] = await connection.execute(
            `INSERT INTO evaluaciones 
             (id_oficial, tipo_evaluacion, fecha_evaluacion, calificacion, evaluador, observaciones, usuario_registro)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                evaluacion.id_oficial,
                evaluacion.tipo_evaluacion,
                evaluacion.fecha_evaluacion, // Ya debe venir en formato YYYY-MM-DD
                evaluacion.calificacion || null,
                evaluacion.evaluador,
                evaluacion.observaciones || null,
                1 // usuario_registro temporal - en producción debería venir del usuario autenticado
            ]
        );
        
        await connection.commit();
        connection.release();
        
        res.status(201).json({
            success: true,
            message: 'Evaluación guardada correctamente',
            id: result.insertId
        });
        
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        console.error('Error al guardar la evaluación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar la evaluación',
            error: error.message,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
    }
});

// Ruta para obtener las evaluaciones
app.get('/api/evaluaciones', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [evaluaciones] = await connection.query(
            `SELECT e.*, o.nombre_completo as nombre_oficial,
                    'Sistema' as nombre_usuario
             FROM evaluaciones e
             JOIN oficiales o ON e.id_oficial = o.id
             ORDER BY e.fecha_evaluacion DESC, e.fecha_registro DESC`
        );
        
        connection.release();
        
        // Formatear fechas para mostrarlas correctamente
        const evaluacionesFormateadas = evaluaciones.map(eval => ({
            ...eval,
            fecha_evaluacion: eval.fecha_evaluacion ? new Date(eval.fecha_evaluacion).toISOString().split('T')[0] : null,
            fecha_registro: eval.fecha_registro ? new Date(eval.fecha_registro).toISOString() : null
        }));
        
        res.json({
            success: true,
            data: evaluacionesFormateadas
        });
        
    } catch (error) {
        if (connection) {
            connection.release();
        }
        
        console.error('Error al obtener las evaluaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las evaluaciones',
            error: error.message,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
    }
});

// Ruta para actualizar el estado de un oficial
app.put('/api/oficiales/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    
    if (activo === undefined) {
        return res.status(400).json({ success: false, message: 'El campo activo es requerido' });
    }
    
    try {
        const [result] = await pool.query(
            'UPDATE oficiales SET activo = ? WHERE id = ?',
            [activo, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Oficial no encontrado' });
        }
        
        res.json({ success: true, message: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar el estado del oficial:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el estado del oficial' });
    }
});

// Ruta para obtener estadísticas de oficiales (activos e inactivos)
app.get('/api/oficiales/estadisticas', async (req, res) => {
    console.log('Solicitud recibida en /api/oficiales/estadisticas');
    let connection;
    try {
        console.log('Obteniendo conexión a la base de datos...');
        connection = await pool.getConnection();
        console.log('Conexión a la base de datos establecida');
        
        // Contar oficiales activos
        console.log('Contando oficiales activos...');
        const [activos] = await connection.query(
            'SELECT COUNT(*) as count FROM oficiales WHERE activo = 1'
        );
        console.log('Oficiales activos:', activos[0].count);
        
        // Contar oficiales inactivos
        console.log('Contando oficiales inactivos...');
        const [inactivos] = await connection.query(
            'SELECT COUNT(*) as count FROM oficiales WHERE activo = 0 OR activo IS NULL'
        );
        console.log('Oficiales inactivos:', inactivos[0].count);
        
        const result = {
            activos: activos[0].count,
            inactivos: inactivos[0].count
        };
        
        console.log('Enviando respuesta:', result);
        res.json(result);
        
    } catch (error) {
        console.error('Error al obtener estadísticas de oficiales:');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas de oficiales',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (connection) {
            console.log('Liberando conexión a la base de datos...');
            await connection.release();
        }
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
    
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            `SELECT id, nombre_completo, curp, cuip, cup, edad, sexo, 
                    estado_civil, area_adscripcion, grado, cargo_actual, 
                    fecha_ingreso, escolaridad, telefono_contacto, 
                    telefono_emergencia, funcion, pdf_nombre_archivo, activo
             FROM oficiales 
             WHERE (nombre_completo LIKE ? OR curp LIKE ? OR cuip LIKE ? OR cup LIKE ?)
             ORDER BY activo DESC, nombre_completo`,
            [`%${termino}%`, `%${termino}%`, `%${termino}%`, `%${termino}%`]
        );
        
        connection.release();
        
        // Mapear resultados para incluir la URL del archivo
        const resultados = rows.map(oficial => ({
            ...oficial,
            pdf_url: oficial.pdf_nombre_archivo ? `/uploads/${oficial.pdf_nombre_archivo}` : null
        }));
        
        res.json({ success: true, data: resultados });
    } catch (error) {
        console.error('Error al buscar oficiales:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al buscar oficiales',
            error: error.message 
        });
    }
});

// Ruta de prueba de conexión
app.get('/api/test', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT 1 as test');
        connection.release();
        res.json({ 
            success: true, 
            message: 'Conexión exitosa a la base de datos', 
            data: rows 
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
});
