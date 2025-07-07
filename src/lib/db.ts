
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
        // WAL mode is recommended for performance and concurrency.
        db.pragma('journal_mode = WAL');
        globalThis.db = db;
        return db;
    } catch (error) {
        console.error("Failed to connect to the database.", error);
        throw new Error("Could not connect to the database. Make sure the `data.db` file exists and is accessible.");
    }
}
