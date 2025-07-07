
import Database from 'better-sqlite3';
import path from 'path';

// Cache the database connection on the global object to prevent
// re-initializing on every hot reload in development. This is crucial.
declare global {
  var db: Database.Database | undefined;
}

const dbPath = path.join(process.cwd(), 'data.db');

/**
 * Provides a stable, cached database connection.
 * This function assumes the database file (`data.db`) exists and has the correct schema.
 * It does not perform any initialization or seeding.
 */
export async function getDb(): Promise<Database.Database> {
    if (globalThis.db) {
        return globalThis.db;
    }

    try {
        const db = new Database(dbPath);
        
        // Simple migration to add 'currency' column if it doesn't exist.
        try {
            const columns = db.pragma('table_info(listings)');
            const hasCurrency = columns.some((col: any) => col.name === 'currency');
            if (!hasCurrency) {
                db.exec("ALTER TABLE listings ADD COLUMN currency TEXT NOT NULL DEFAULT 'NGN'");
                console.log('[DB_MIGRATE] Added "currency" column to "listings" table.');
            }
        } catch (migrationError) {
             console.error("[DB_MIGRATE_ERROR] Could not apply migration:", migrationError);
             // Don't re-throw, let the app continue if possible.
        }

        globalThis.db = db;
        return db;
    } catch (error) {
        console.error("Failed to connect to the database.", error);
        throw new Error("Could not connect to the database. Make sure the `data.db` file exists and is accessible.");
    }
}
