/**
 * Database connection management
 * Supports MySQL and PostgreSQL
 */

import mysql from 'mysql2/promise';
import { Pool, QueryResult } from 'pg';
import pg from 'pg';

export type DatabaseType = 'mysql' | 'postgresql';

interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

let pool: mysql.Pool | Pool;
let dbType: DatabaseType;

export async function initializeConnection(): Promise<void> {
  const type = (process.env.DB_TYPE || 'mysql') as DatabaseType;
  dbType = type;

  const config: DatabaseConfig = {
    type,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (type === 'mysql' ? '3306' : '5432')),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'my_mail',
  };

  if (type === 'mysql') {
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('✅ MySQL connection pool created');
  } else {
    pool = new pg.Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 10,
    });
    console.log('✅ PostgreSQL connection pool created');
  }

  // Test connection
  try {
    if (type === 'mysql') {
      const connection = await (pool as mysql.Pool).getConnection();
      await connection.ping();
      connection.release();
    } else {
      const client = await (pool as Pool).connect();
      await client.query('SELECT NOW()');
      client.release();
    }
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  try {
    if (dbType === 'mysql') {
      const [rows] = await (pool as mysql.Pool).execute(sql, params);
      return rows;
    } else {
      const result = await (pool as Pool).query(sql, params);
      return result.rows;
    }
  } catch (error) {
    console.error('Query error:', error, 'SQL:', sql);
    throw error;
  }
}

export async function queryOne(sql: string, params: any[] = []): Promise<any> {
  const results = await query(sql, params);
  return results?.[0] || null;
}

export async function execute(sql: string, params: any[] = []): Promise<any> {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  try {
    if (dbType === 'mysql') {
      const result = await (pool as mysql.Pool).execute(sql, params);
      return {
        affectedRows: result[0].affectedRows,
        insertId: result[0].insertId,
      };
    } else {
      const result = await (pool as Pool).query(sql, params);
      return {
        affectedRows: result.rowCount,
        insertId: null,
      };
    }
  } catch (error) {
    console.error('Execute error:', error, 'SQL:', sql);
    throw error;
  }
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    if (dbType === 'mysql') {
      await (pool as mysql.Pool).end();
    } else {
      await (pool as Pool).end();
    }
    console.log('✅ Database connection closed');
  }
}

export function getDbType(): DatabaseType {
  return dbType;
}

