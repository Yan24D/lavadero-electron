const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lavadero_db'
};

// Crear conexión a la base de datos
async function createConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado a MySQL');
        return connection;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error);
        throw error;
    }
}

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lavadero_secret_key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
};

// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email y contraseña son requeridos' 
            });
        }

        const connection = await createConnection();
        
        // Buscar usuario por email
        const [users] = await connection.execute(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        await connection.end();

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales inválidas' 
            });
        }

        const user = users[0];

        // Verificar contraseña
        let passwordValid = false;
        if (user.password) {
            // Si la contraseña está hasheada
            passwordValid = await bcrypt.compare(password, user.password);
        } else {
            // Para usuarios creados con Google OAuth que no tienen contraseña local
            return res.status(401).json({ 
                success: false, 
                message: 'Use Google para iniciar sesión' 
            });
        }

        if (!passwordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales inválidas' 
            });
        }

        // Generar JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                rol: user.rol 
            },
            process.env.JWT_SECRET || 'lavadero_secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombre, email, rol, password } = req.body;

        // Validaciones
        if (!nombre || !email || !rol || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        if (!['admin', 'secretario'].includes(rol)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rol inválido' 
            });
        }

        const connection = await createConnection();

        // Verificar si el email ya existe
        const [existingUsers] = await connection.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.end();
            return res.status(400).json({ 
                success: false, 
                message: 'El email ya está registrado' 
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar nuevo usuario
        const [result] = await connection.execute(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPassword, rol]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Ruta para obtener perfil del usuario (protegida)
app.get('/api/auth/profile', verifyToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [users] = await connection.execute(
            'SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        await connection.end();

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Rutas para servicios
app.get('/api/servicios', verifyToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [servicios] = await connection.execute(
            'SELECT * FROM servicios ORDER BY creado_en DESC'
        );

        await connection.end();

        res.json({
            success: true,
            servicios
        });

    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

app.post('/api/servicios', verifyToken, async (req, res) => {
    try {
        // Solo administradores pueden crear servicios
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo los administradores pueden crear servicios' 
            });
        }

        const { nombre, descripcion, precio_base } = req.body;

        if (!nombre || !precio_base) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre y precio base son requeridos' 
            });
        }

        const connection = await createConnection();

        const [result] = await connection.execute(
            'INSERT INTO servicios (nombre, descripcion, precio_base) VALUES (?, ?, ?)',
            [nombre, descripcion || null, parseFloat(precio_base)]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Servicio creado exitosamente',
            servicioId: result.insertId
        });

    } catch (error) {
        console.error('Error creando servicio:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Rutas para registros
app.get('/api/registros', verifyToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        const query = `
            SELECT r.*, s.nombre as servicio_nombre, u.nombre as usuario_nombre
            FROM registros r
            LEFT JOIN servicios s ON r.id_servicio = s.id
            LEFT JOIN usuarios u ON r.id_usuario = u.id
            ORDER BY r.fecha DESC, r.hora DESC
        `;
        
        const [registros] = await connection.execute(query);

        await connection.end();

        res.json({
            success: true,
            registros
        });

    } catch (error) {
        console.error('Error obteniendo registros:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

app.post('/api/registros', verifyToken, async (req, res) => {
    try {
        const { vehiculo, placa, id_servicio, costo, porcentaje, lavador, observaciones } = req.body;

        if (!vehiculo || !placa || !id_servicio || !costo || !porcentaje || !lavador) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos obligatorios deben ser completados' 
            });
        }

        const connection = await createConnection();

        // Verificar que el servicio existe
        const [servicios] = await connection.execute(
            'SELECT id FROM servicios WHERE id = ?',
            [id_servicio]
        );

        if (servicios.length === 0) {
            await connection.end();
            return res.status(400).json({ 
                success: false, 
                message: 'El servicio especificado no existe' 
            });
        }

        const [result] = await connection.execute(
            `INSERT INTO registros 
            (vehiculo, placa, id_servicio, costo, porcentaje, lavador, observaciones, id_usuario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [vehiculo, placa, id_servicio, parseFloat(costo), parseFloat(porcentaje), lavador, observaciones || null, req.user.id]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Registro creado exitosamente',
            registroId: result.insertId
        });

    } catch (error) {
        console.error('Error creando registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Actualizar estado de pago
app.patch('/api/registros/:id/pago', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { pago } = req.body;

        if (!['Pendiente', 'Pagado'].includes(pago)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Estado de pago inválido' 
            });
        }

        const connection = await createConnection();

        const [result] = await connection.execute(
            'UPDATE registros SET pago = ? WHERE id = ?',
            [pago, id]
        );

        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Registro no encontrado' 
            });
        }

        res.json({
            success: true,
            message: 'Estado de pago actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando pago:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Reportes
app.get('/api/reportes/resumen', verifyToken, async (req, res) => {
    try {
        const connection = await createConnection();

        // Resumen general
        const [resumen] = await connection.execute(`
            SELECT 
                COUNT(*) as total_registros,
                SUM(CASE WHEN pago = 'Pagado' THEN costo ELSE 0 END) as ingresos_pagados,
                SUM(CASE WHEN pago = 'Pendiente' THEN costo ELSE 0 END) as ingresos_pendientes,
                SUM(costo) as ingresos_totales,
                COUNT(CASE WHEN DATE(fecha) = CURDATE() THEN 1 END) as registros_hoy
            FROM registros
        `);

        // Servicios más utilizados
        const [serviciosPopulares] = await connection.execute(`
            SELECT s.nombre, COUNT(r.id) as cantidad, SUM(r.costo) as ingresos
            FROM registros r
            JOIN servicios s ON r.id_servicio = s.id
            GROUP BY s.id, s.nombre
            ORDER BY cantidad DESC
            LIMIT 5
        `);

        await connection.end();

        res.json({
            success: true,
            resumen: resumen[0],
            servicios_populares: serviciosPopulares
        });

    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log('📊 Endpoints disponibles:');
    console.log('   POST /api/auth/login');
    console.log('   POST /api/auth/register');
    console.log('   GET  /api/auth/profile');
    console.log('   GET  /api/servicios');
    console.log('   POST /api/servicios');
    console.log('   GET  /api/registros');
    console.log('   POST /api/registros');
    console.log('   PATCH /api/registros/:id/pago');
    console.log('   GET  /api/reportes/resumen');
});