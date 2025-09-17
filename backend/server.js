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


// ===== RUTAS PARA LAVADORES =====

// Obtener todos los lavadores activos
app.get('/api/lavadores', verifyToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [lavadores] = await connection.execute(
            'SELECT * FROM lavadores WHERE activo = TRUE ORDER BY nombre, apellido'
        );

        await connection.end();

        res.json({
            success: true,
            lavadores
        });

    } catch (error) {
        console.error('Error obteniendo lavadores:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Crear nuevo lavador (solo admin)
app.post('/api/lavadores', verifyToken, async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo los administradores pueden crear lavadores' 
            });
        }

        const { nombre, apellido } = req.body;

        if (!nombre || !apellido) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre y apellido son requeridos' 
            });
        }

        const connection = await createConnection();

        const [result] = await connection.execute(
            'INSERT INTO lavadores (nombre, apellido) VALUES (?, ?)',
            [nombre, apellido]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Lavador creado exitosamente',
            lavadorId: result.insertId
        });

    } catch (error) {
        console.error('Error creando lavador:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ===== RUTAS MEJORADAS PARA REGISTROS =====

// Obtener registros con filtros mejorados
app.get('/api/registros', verifyToken, async (req, res) => {
    try {
        const { fecha, placa, servicio, lavador, limit = 100, offset = 0 } = req.query;
        
        const connection = await createConnection();
        
        let query = `
            SELECT r.*, s.nombre as servicio_nombre, u.nombre as usuario_nombre
            FROM registros r
            LEFT JOIN servicios s ON r.id_servicio = s.id
            LEFT JOIN usuarios u ON r.id_usuario = u.id
            WHERE 1=1
        `;
        const params = [];

        // Aplicar filtros
        if (fecha) {
            query += ' AND r.fecha = ?';
            params.push(fecha);
        }

        if (placa) {
            query += ' AND r.placa LIKE ?';
            params.push(`%${placa}%`);
        }

        if (servicio) {
            query += ' AND r.id_servicio = ?';
            params.push(servicio);
        }

        if (lavador) {
            query += ' AND r.lavador LIKE ?';
            params.push(`%${lavador}%`);
        }

        query += ' ORDER BY r.fecha DESC, r.hora DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [registros] = await connection.execute(query, params);

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

// Nueva ruta para búsqueda específica
app.get('/api/registros/buscar', verifyToken, async (req, res) => {
    try {
        const { placa, fecha, servicio, fecha_inicio, fecha_fin } = req.query;
        
        if (!placa && !fecha && !servicio && !fecha_inicio) {
            return res.status(400).json({
                success: false,
                message: 'Al menos un criterio de búsqueda es requerido'
            });
        }

        const connection = await createConnection();
        
        let query = `
            SELECT r.*, s.nombre as servicio_nombre, u.nombre as usuario_nombre
            FROM registros r
            LEFT JOIN servicios s ON r.id_servicio = s.id
            LEFT JOIN usuarios u ON r.id_usuario = u.id
            WHERE 1=1
        `;
        const params = [];

        if (placa) {
            query += ' AND r.placa LIKE ?';
            params.push(`%${placa.toUpperCase()}%`);
        }

        if (fecha) {
            query += ' AND r.fecha = ?';
            params.push(fecha);
        } else if (fecha_inicio && fecha_fin) {
            query += ' AND r.fecha BETWEEN ? AND ?';
            params.push(fecha_inicio, fecha_fin);
        }

        if (servicio) {
            query += ' AND r.id_servicio = ?';
            params.push(servicio);
        }

        query += ' ORDER BY r.fecha DESC, r.hora DESC LIMIT 50';
        
        const [registros] = await connection.execute(query, params);

        await connection.end();

        res.json({
            success: true,
            registros,
            total: registros.length
        });

    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Obtener registro específico por ID
app.get('/api/registros/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const connection = await createConnection();
        
        const [registros] = await connection.execute(`
            SELECT r.*, s.nombre as servicio_nombre, u.nombre as usuario_nombre
            FROM registros r
            LEFT JOIN servicios s ON r.id_servicio = s.id
            LEFT JOIN usuarios u ON r.id_usuario = u.id
            WHERE r.id = ?
        `, [id]);

        await connection.end();

        if (registros.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Registro no encontrado' 
            });
        }

        res.json({
            success: true,
            registro: registros[0]
        });

    } catch (error) {
        console.error('Error obteniendo registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Actualizar registro completo
app.put('/api/registros/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { vehiculo, placa, costo, porcentaje, observaciones, pago } = req.body;

        if (!vehiculo || !placa || !costo || porcentaje === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos obligatorios deben ser proporcionados' 
            });
        }

        const connection = await createConnection();

        // Verificar que el registro existe
        const [existingRecord] = await connection.execute(
            'SELECT id FROM registros WHERE id = ?',
            [id]
        );

        if (existingRecord.length === 0) {
            await connection.end();
            return res.status(404).json({ 
                success: false, 
                message: 'Registro no encontrado' 
            });
        }

        // Actualizar registro
        const [result] = await connection.execute(`
            UPDATE registros 
            SET vehiculo = ?, placa = ?, costo = ?, porcentaje = ?, 
                observaciones = ?, pago = ?
            WHERE id = ?
        `, [vehiculo, placa.toUpperCase(), parseFloat(costo), parseFloat(porcentaje), 
            observaciones, pago, id]);

        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No se pudo actualizar el registro' 
            });
        }

        res.json({
            success: true,
            message: 'Registro actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Eliminar registro
app.delete('/api/registros/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Solo admin puede eliminar o el usuario que creó el registro
        const connection = await createConnection();

        let query = 'DELETE FROM registros WHERE id = ?';
        let params = [id];

        // Si no es admin, solo puede eliminar sus propios registros
        if (req.user.rol !== 'admin') {
            query += ' AND id_usuario = ?';
            params.push(req.user.id);
        }

        const [result] = await connection.execute(query, params);

        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Registro no encontrado o sin permisos para eliminarlo' 
            });
        }

        res.json({
            success: true,
            message: 'Registro eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ===== REPORTES MEJORADOS =====

// Reporte detallado con más estadísticas
app.get('/api/reportes/detallado', verifyToken, async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        const connection = await createConnection();

        // Fechas por defecto (último mes)
        const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
        const fechaInicio = fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Resumen general
        const [resumen] = await connection.execute(`
            SELECT 
                COUNT(*) as total_registros,
                SUM(CASE WHEN pago = 'Pagado' THEN costo ELSE 0 END) as ingresos_pagados,
                SUM(CASE WHEN pago = 'Pendiente' THEN costo ELSE 0 END) as ingresos_pendientes,
                SUM(costo) as ingresos_totales,
                SUM(CASE WHEN pago = 'Pagado' THEN (costo * porcentaje / 100) ELSE 0 END) as comisiones_pagadas,
                SUM(costo * porcentaje / 100) as comisiones_totales,
                AVG(costo) as precio_promedio,
                COUNT(DISTINCT lavador) as lavadores_activos
            FROM registros 
            WHERE fecha BETWEEN ? AND ?
        `, [fechaInicio, fechaFin]);

        // Top lavadores
        const [topLavadores] = await connection.execute(`
            SELECT 
                lavador,
                COUNT(*) as servicios_realizados,
                SUM(costo) as ingresos_generados,
                SUM(costo * porcentaje / 100) as comisiones_totales,
                AVG(costo) as precio_promedio
            FROM registros 
            WHERE fecha BETWEEN ? AND ?
            GROUP BY lavador
            ORDER BY ingresos_generados DESC
            LIMIT 10
        `, [fechaInicio, fechaFin]);

        // Servicios más populares
        const [topServicios] = await connection.execute(`
            SELECT 
                s.nombre,
                s.precio_base,
                COUNT(r.id) as veces_solicitado,
                SUM(r.costo) as ingresos_generados,
                AVG(r.costo) as precio_promedio_cobrado
            FROM registros r
            JOIN servicios s ON r.id_servicio = s.id
            WHERE r.fecha BETWEEN ? AND ?
            GROUP BY s.id, s.nombre, s.precio_base
            ORDER BY veces_solicitado DESC
            LIMIT 10
        `, [fechaInicio, fechaFin]);

        // Estadísticas por día de la semana
        const [estadisticasDias] = await connection.execute(`
            SELECT 
                DAYNAME(fecha) as dia_semana,
                DAYOFWEEK(fecha) as numero_dia,
                COUNT(*) as total_servicios,
                SUM(costo) as ingresos_totales,
                AVG(costo) as precio_promedio
            FROM registros 
            WHERE fecha BETWEEN ? AND ?
            GROUP BY DAYOFWEEK(fecha), DAYNAME(fecha)
            ORDER BY numero_dia
        `, [fechaInicio, fechaFin]);

        // Tipos de vehículo más atendidos
        const [tiposVehiculo] = await connection.execute(`
            SELECT 
                vehiculo,
                COUNT(*) as cantidad,
                SUM(costo) as ingresos,
                AVG(costo) as precio_promedio
            FROM registros 
            WHERE fecha BETWEEN ? AND ?
            GROUP BY vehiculo
            ORDER BY cantidad DESC
        `, [fechaInicio, fechaFin]);

        await connection.end();

        res.json({
            success: true,
            periodo: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            },
            resumen: resumen[0],
            top_lavadores: topLavadores,
            servicios_populares: topServicios,
            estadisticas_dias: estadisticasDias,
            tipos_vehiculo: tiposVehiculo
        });

    } catch (error) {
        console.error('Error generando reporte detallado:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ===== ENDPOINT DE SALUD =====
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// Obtener servicios disponibles por tipo de vehículo
app.get('/api/servicios/vehiculo/:tipo', verifyToken, async (req, res) => {
    try {
        const { tipo } = req.params;
        
        // Validar tipo de vehículo
        const tiposValidos = ['motorcycle', 'car', 'pickup', 'suv', 'truck'];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de vehículo no válido'
            });
        }

        const connection = await createConnection();
        
        const [servicios] = await connection.execute(`
            SELECT 
                s.id,
                s.nombre,
                s.descripcion,
                sp.precio,
                sp.tipo_vehiculo
            FROM servicios s
            INNER JOIN servicio_precios sp ON s.id = sp.id_servicio
            WHERE sp.tipo_vehiculo = ? AND sp.activo = TRUE
            ORDER BY sp.precio ASC
        `, [tipo]);

        await connection.end();

        res.json({
            success: true,
            servicios,
            tipo_vehiculo: tipo
        });

    } catch (error) {
        console.error('Error obteniendo servicios por vehículo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Obtener precio específico por servicio y vehículo
app.get('/api/servicios/:id/precio/:vehiculo', verifyToken, async (req, res) => {
    try {
        const { id, vehiculo } = req.params;

        const connection = await createConnection();
        
        const [precios] = await connection.execute(`
            SELECT 
                s.nombre,
                sp.precio,
                sp.tipo_vehiculo
            FROM servicios s
            INNER JOIN servicio_precios sp ON s.id = sp.id_servicio
            WHERE s.id = ? AND sp.tipo_vehiculo = ? AND sp.activo = TRUE
        `, [id, vehiculo]);

        await connection.end();

        if (precios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró precio para este servicio y tipo de vehículo'
            });
        }

        res.json({
            success: true,
            precio: precios[0].precio,
            servicio: precios[0].nombre,
            vehiculo: vehiculo
        });

    } catch (error) {
        console.error('Error obteniendo precio específico:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Obtener todos los precios (para admin)
app.get('/api/servicios/precios/todos', verifyToken, async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo los administradores pueden ver todos los precios' 
            });
        }

        const connection = await createConnection();
        
        const [precios] = await connection.execute(`
            SELECT * FROM vista_lista_precios WHERE activo = TRUE
        `);

        await connection.end();

        // Agrupar por servicio
        const preciosAgrupados = precios.reduce((acc, precio) => {
            const servicioId = precio.servicio_id;
            if (!acc[servicioId]) {
                acc[servicioId] = {
                    servicio_id: precio.servicio_id,
                    servicio_nombre: precio.servicio_nombre,
                    descripcion: precio.descripcion,
                    precios_por_vehiculo: {}
                };
            }
            acc[servicioId].precios_por_vehiculo[precio.tipo_vehiculo] = {
                precio: precio.precio,
                vehiculo_nombre: precio.vehiculo_nombre
            };
            return acc;
        }, {});

        res.json({
            success: true,
            precios: Object.values(preciosAgrupados)
        });

    } catch (error) {
        console.error('Error obteniendo todos los precios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Actualizar precio específico (solo admin)
app.put('/api/servicios/:id/precio/:vehiculo', verifyToken, async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo los administradores pueden actualizar precios' 
            });
        }

        const { id, vehiculo } = req.params;
        const { precio } = req.body;

        if (!precio || precio <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El precio debe ser mayor a 0'
            });
        }

        const connection = await createConnection();

        const [result] = await connection.execute(`
            UPDATE servicio_precios 
            SET precio = ?
            WHERE id_servicio = ? AND tipo_vehiculo = ?
        `, [parseFloat(precio), id, vehiculo]);

        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el precio a actualizar'
            });
        }

        res.json({
            success: true,
            message: 'Precio actualizado correctamente'
        });

    } catch (error) {
        console.error('Error actualizando precio:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Actualizar el endpoint de servicios existente para incluir precios básicos
// MODIFICAR la ruta existente /api/servicios:

app.get('/api/servicios', verifyToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        // Obtener servicios con precios promedio
        const [servicios] = await connection.execute(`
            SELECT 
                s.*,
                ROUND(AVG(sp.precio), 2) as precio_promedio,
                COUNT(sp.id) as tipos_vehiculo_disponibles
            FROM servicios s
            LEFT JOIN servicio_precios sp ON s.id = sp.id_servicio AND sp.activo = TRUE
            GROUP BY s.id
            ORDER BY s.creado_en DESC
        `);

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

// Endpoint para obtener servicios populares (para cards rápidas)
app.get('/api/servicios/populares/:vehiculo?', verifyToken, async (req, res) => {
    try {
        const { vehiculo } = req.params;
        const connection = await createConnection();
        
        // Obtener servicios con precios y estadísticas de uso
        let query = `
            SELECT 
                s.id,
                s.nombre,
                s.descripcion,
                sp.precio,
                sp.tipo_vehiculo,
                COALESCE(stats.veces_usado, 0) as veces_usado
            FROM servicios s
            INNER JOIN servicio_precios sp ON s.id = sp.id_servicio
            LEFT JOIN (
                SELECT 
                    id_servicio, 
                    COUNT(*) as veces_usado
                FROM registros 
                WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY id_servicio
            ) stats ON s.id = stats.id_servicio
            WHERE sp.activo = TRUE
        `;
        
        const params = [];
        
        if (vehiculo && vehiculo !== 'todos') {
            query += ' AND sp.tipo_vehiculo = ?';
            params.push(vehiculo);
        }
        
        query += ` ORDER BY veces_usado DESC, s.nombre ASC`;
        
        const [servicios] = await connection.execute(query, params);
        await connection.end();

        res.json({
            success: true,
            servicios_populares: servicios,
            filtro_vehiculo: vehiculo || 'todos'
        });

    } catch (error) {
        console.error('Error obteniendo servicios populares:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ===== ACTUALIZAR EL LOG DE INICIO =====
// Reemplazar el console.log final del servidor con:

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log('📊 Endpoints disponibles:');
    console.log('   === AUTENTICACIÓN ===');
    console.log('   POST /api/auth/login');
    console.log('   POST /api/auth/register');
    console.log('   GET  /api/auth/profile');
    console.log('   === SERVICIOS ===');
    console.log('   GET  /api/servicios');
    console.log('   POST /api/servicios');
    console.log('   === LAVADORES ===');
    console.log('   GET  /api/lavadores');
    console.log('   POST /api/lavadores');
    console.log('   === REGISTROS ===');
    console.log('   GET  /api/registros');
    console.log('   GET  /api/registros/buscar');
    console.log('   GET  /api/registros/:id');
    console.log('   POST /api/registros');
    console.log('   PUT  /api/registros/:id');
    console.log('   DELETE /api/registros/:id');
    console.log('   PATCH /api/registros/:id/pago');
    console.log('   === REPORTES ===');
    console.log('   GET  /api/reportes/resumen');
    console.log('   GET  /api/reportes/detallado');
    console.log('   === OTROS ===');
    console.log('   GET  /api/health');
    console.log('   === SERVICIOS CON PRECIOS ===');
    console.log('   GET  /api/servicios/vehiculo/:tipo');
    console.log('   GET  /api/servicios/:id/precio/:vehiculo');
    console.log('   GET  /api/servicios/precios/todos');
    console.log('   GET  /api/servicios/populares/:vehiculo?');
    console.log('   PUT  /api/servicios/:id/precio/:vehiculo');
});