
import Database from 'better-sqlite3';
import path from 'path';

// Cache the database connection on the global object to prevent
// re-initializing on every hot reload in development. This is crucial.
declare global {
  var db: Database.Database | undefined;
}

const dbPath = path.join(process.cwd(), 'data.db');

function runMigrations(db: Database.Database) {
    console.log('[DB_MIGRATE] Checking database schema...');
    
    // Migration 1: Add 'currency' column to 'listings' table
    try {
        const columns = db.pragma('table_info(listings)');
        const hasCurrency = columns.some((col: any) => col.name === 'currency');

        if (!hasCurrency) {
            console.log('[DB_MIGRATE] "currency" column not found. Applying migration...');
            db.exec("ALTER TABLE listings ADD COLUMN currency TEXT NOT NULL DEFAULT 'NGN'");
            console.log('[DB_MIGRATE] Migration successful: Added "currency" column with default "NGN".');
        } else {
            console.log('[DB_MIGRATE] "currency" column already exists. No migration needed.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during 'currency' column migration:", error);
        // This is a critical failure. If we can't migrate the schema, we must stop the app from proceeding with a broken DB state.
        throw new Error("Database migration failed. The application cannot start.");
    }
}

/**
 * Provides a stable, cached database connection and applies necessary migrations.
 */
export async function getDb(): Promise<Database.Database> {
    if (globalThis.db) {
        return globalThis.db;
    }

    try {
        const db = new Database(dbPath);
        
        // Run all migrations
        runMigrations(db);

        globalThis.db = db;
        return db;
    } catch (error) {
        console.error("Failed to connect to the database or run migrations.", error);
        // Re-throwing the original error if it's from migrations, or a new one.
        if (error instanceof Error && error.message.includes("Database migration failed")) {
            throw error;
        }
        throw new Error("Could not connect to the database. Make sure the `data.db` file exists and is accessible.");
    }
}
