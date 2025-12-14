import { getDbPool } from './connection';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
  try {
    const db = getDbPool();
    
    console.log('🔄 Running database migrations...');
    
    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split by semicolon and filter empty statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await db.query(statement);
      } catch (error: any) {
        // Ignore "table already exists" errors
        if (!error.message.includes('already exists')) {
          console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
          throw error;
        }
      }
    }
    
    console.log('✅ Database migrations completed successfully');
    console.log(`   Executed ${statements.length} statements`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
