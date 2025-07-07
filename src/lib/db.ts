
'use server';

import Database from 'better-sqlite3';
import path from 'path';

// Cache the database connection on the global object to prevent
// re-initializing on every hot reload in development. This is crucial.
declare global {
  var db: Database.Database | undefined;
}

const dbPath = path.join(process.cwd(), 'data.db');

function runCurrencyMigration(db: Database.Database) {
    try {
        const columns = db.pragma('table_info(listings)');
        const hasCurrency = columns.some((col: any) => col.name === 'currency');

        if (!hasCurrency) {
            console.log('[DB_MIGRATE] Applying "currency" column migration to listings...');
            db.exec("ALTER TABLE listings ADD COLUMN currency TEXT NOT NULL DEFAULT 'NGN'");
            console.log('[DB_MIGRATE] Migration successful.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during 'currency' column migration:", error);
        throw new Error("Database migration for 'currency' column failed. The application cannot start.");
    }
}

function runBookingActionTrackingMigration(db: Database.Database) {
    try {
        const columns = db.pragma('table_info(bookings)') as { name: string }[];
        let migrationApplied = false;

        if (!columns.some(col => col.name === 'actionByUserId')) {
            console.log('[DB_MIGRATE] Adding "actionByUserId" column to bookings...');
            db.exec("ALTER TABLE bookings ADD COLUMN actionByUserId TEXT");
            migrationApplied = true;
        }
        if (!columns.some(col => col.name === 'actionAt')) {
            console.log('[DB_MIGRATE] Adding "actionAt" column to bookings...');
            db.exec("ALTER TABLE bookings ADD COLUMN actionAt TEXT");
            migrationApplied = true;
        }
        if (!columns.some(col => col.name === 'statusMessage')) {
            console.log('[DB_MIGRATE] Adding "statusMessage" column to bookings...');
            db.exec("ALTER TABLE bookings ADD COLUMN statusMessage TEXT");
            migrationApplied = true;
        }
        
        if (migrationApplied) {
            console.log('[DB_MIGRATE] Booking action tracking migrations applied successfully.');
        }

    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during booking action tracking migration:", error);
        throw new Error("Database migration for booking actions failed. The application cannot start.");
    }
}

/**
 * Provides a stable, cached database connection and applies necessary migrations.
 * This function now runs migrations on every call to ensure schema consistency,
 * especially in a hot-reloading development environment.
 */
export async function getDb(): Promise<Database.Database> {
    try {
        // Initialize the database connection if it's not already cached.
        if (!globalThis.db) {
            console.log('[DB_SETUP] No cached DB connection found. Initializing new connection.');
            globalThis.db = new Database(dbPath);
        }
        
        const db = globalThis.db;

        // --- Run All Migrations ---
        // These functions are idempotent (they check before acting), so it's safe 
        // to call them on every DB access during development.
        runCurrencyMigration(db);
        runBookingActionTrackingMigration(db);

        return db;
    } catch (error) {
        console.error("Failed to connect to the database or run migrations.", error);
        // If setup fails, clear the cache to allow a retry on the next request.
        globalThis.db = undefined;
        // Re-throw to prevent the app from running in a broken state.
        if (error instanceof Error && error.message.includes("Database migration failed")) {
            throw error;
        }
        throw new Error("Could not connect to the database. Make sure the `data.db` file exists and is accessible.");
    }
}
