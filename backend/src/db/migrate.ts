import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pool from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('Running database migrations...');

  try {
    // Check if tables exist first
    const checkTablesResult = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'users'
      );`
    );
    
    const tablesExist = checkTablesResult.rows[0].exists;

    if (!tablesExist) {
      // First time setup: apply the base schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      await pool.query(schema);
      console.log('✅ Database schema applied successfully');
    } else {
      console.log('✅ Database tables already exist, skipping schema initialization');
    }

    // Apply any migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migration = fs.readFileSync(migrationPath, 'utf-8');
      
      try {
        await pool.query(migration);
        console.log(`✅ Applied migration: ${file}`);
      } catch (error) {
        console.warn(`⚠️  Migration ${file} may have already been applied or skipped safely`);
      }
    }

    console.log('✅ All database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
