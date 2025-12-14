import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (pool) {
    return pool;
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'onnplay_studio',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  pool = mysql.createPool(config);

  console.log(`✅ MySQL connection pool created (${config.host}:${config.port}/${config.database})`);

  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const db = getDbPool();
  const [rows] = await db.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const db = getDbPool();
  const [result] = await db.execute(sql, params);
  return result as mysql.ResultSetHeader;
}
