const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lavadero_db',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000
};

class Database {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
    }

    async getConnection() {
        try {
            const connection = await this.pool.getConnection();
            return connection;
        } catch (error) {
            console.error('Error obteniendo conexión:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        const connection = await this.getConnection();
        try {
            const [results] = await connection.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Error en consulta:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async testConnection() {
        try {
            const connection = await this.getConnection();
            await connection.ping();
            connection.release();
            console.log('✅ Conexión a base de datos exitosa');
            return true;
        } catch (error) {
            console.error('❌ Error conectando a base de datos:', error.message);
            return false;
        }
    }
}

module.exports = new Database();