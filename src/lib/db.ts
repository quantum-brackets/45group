
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
 * NOTE: This function no longer seeds the database with initial data.
 * It assumes the database file (`data.db`) exists and is correctly structured.
 * If the file does not exist, better-sqlite3 will create it.
 */
export async function getDb(): Promise<Database.Database> {
    if (globalThis.db) {
        return globalThis.db;
    }

    const db = new Database(dbPath);
    // WAL mode is recommended for performance and concurrency.
    db.pragma('journal_mode = WAL');

    // Since the database is no longer seeded automatically, we need to ensure tables exist.
    // This will run only once when the connection is first established per server start.
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'guest'
        );`);

    db.exec(`
        CREATE TABLE IF NOT EXISTS listings (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            images TEXT,
            price REAL NOT NULL,
            priceUnit TEXT NOT NULL,
            rating REAL,
            reviews TEXT,
            features TEXT,
            maxGuests INTEGER
        );`);

    db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            listingId TEXT NOT NULL,
            userId TEXT NOT NULL,
            listingName TEXT NOT NULL,
            startDate TEXT NOT NULL,
            endDate TEXT NOT NULL,
            guests INTEGER NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (listingId) REFERENCES listings (id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        );`);

    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            expiresAt DATETIME NOT NULL,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        );`);

    globalThis.db = db;
    return db;
}
