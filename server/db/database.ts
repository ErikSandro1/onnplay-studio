import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Database {
  query(sql: string, params?: any[]): Promise<any[]>;
  close(): Promise<void>;
}

/**
 * Create database connection
 */
export async function createDatabase(): Promise<Database> {
  // For development, use SQLite-like in-memory storage
  // For production, use MySQL/PostgreSQL
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    console.log('📦 Using in-memory database for development');
    return createInMemoryDatabase();
  }

  // Production: Connect to MySQL
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'onnplay_studio',
  });

  console.log('✅ Connected to MySQL database');

  // Run schema initialization
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const statements = schema.split(';').filter((s) => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      await connection.query(statement);
    }
  }

  console.log('✅ Database schema initialized');

  return {
    async query(sql: string, params?: any[]): Promise<any[]> {
      const [rows] = await connection.query(sql, params);
      return rows as any[];
    },
    async close(): Promise<void> {
      await connection.end();
    },
  };
}

/**
 * In-memory database for development (simple object storage)
 */
function createInMemoryDatabase(): Database {
  const tables: Record<string, any[]> = {
    users: [],
    subscriptions: [],
    usage: [],
    broadcasts: [],
    recordings: [],
    webhook_events: [],
    api_keys: [],
  };

  return {
    async query(sql: string, params: any[] = []): Promise<any[]> {
      // Simple SQL parser for development
      const sqlLower = sql.toLowerCase().trim();

      // INSERT
      if (sqlLower.startsWith('insert into')) {
        const match = sql.match(/insert into (\w+)/i);
        if (match) {
          const table = match[1];
          const record: any = {};

          // Parse column names and values
          const columnsMatch = sql.match(/\(([^)]+)\)/);
          const valuesMatch = sql.match(/values\s*\(([^)]+)\)/i);

          if (columnsMatch && valuesMatch) {
            const columns = columnsMatch[1].split(',').map((c) => c.trim());
            const values = params;

            columns.forEach((col, i) => {
              record[col] = values[i];
            });

            if (!tables[table]) {
              tables[table] = [];
            }
            tables[table].push(record);
          }
        }
        return [];
      }

      // SELECT
      if (sqlLower.startsWith('select')) {
        const match = sql.match(/from (\w+)/i);
        if (match) {
          const table = match[1];
          let records = tables[table] || [];

          // Simple WHERE clause parsing
          if (sql.includes('WHERE') || sql.includes('where')) {
            const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
            if (whereMatch && params.length > 0) {
              const column = whereMatch[1];
              const value = params[0];
              records = records.filter((r) => r[column] === value);
            }
          }

          // LIMIT
          if (sql.includes('LIMIT') || sql.includes('limit')) {
            const limitMatch = sql.match(/limit\s+(\d+)/i);
            if (limitMatch) {
              const limit = parseInt(limitMatch[1]);
              records = records.slice(0, limit);
            }
          }

          return records;
        }
      }

      // UPDATE
      if (sqlLower.startsWith('update')) {
        const match = sql.match(/update (\w+)/i);
        if (match) {
          const table = match[1];
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);

          if (whereMatch && tables[table]) {
            const whereColumn = whereMatch[1];
            const whereValue = params[params.length - 1];

            // Parse SET clause
            const setMatch = sql.match(/set\s+(.+?)\s+where/i);
            if (setMatch) {
              const setPairs = setMatch[1].split(',');
              const updates: any = {};

              setPairs.forEach((pair, i) => {
                const [column] = pair.split('=').map((s) => s.trim());
                updates[column] = params[i];
              });

              tables[table] = tables[table].map((record) => {
                if (record[whereColumn] === whereValue) {
                  return { ...record, ...updates };
                }
                return record;
              });
            }
          }
        }
        return [];
      }

      // DELETE
      if (sqlLower.startsWith('delete')) {
        const match = sql.match(/from (\w+)/i);
        if (match) {
          const table = match[1];
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);

          if (whereMatch && tables[table]) {
            const column = whereMatch[1];
            const value = params[0];
            tables[table] = tables[table].filter((r) => r[column] !== value);
          }
        }
        return [];
      }

      return [];
    },
    async close(): Promise<void> {
      // No-op for in-memory database
    },
  };
}
