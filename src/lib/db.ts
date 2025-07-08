
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

function runBookingCreationDateMigration(db: Database.Database) {
    try {
        const columns = db.pragma('table_info(bookings)') as { name: string }[];
        if (!columns.some(col => col.name === 'createdAt')) {
            console.log('[DB_MIGRATE] Adding "createdAt" column to bookings...');
            db.exec("ALTER TABLE bookings ADD COLUMN createdAt TEXT");
            
            // For existing bookings, we can set a reasonable default, like the start date of the booking.
            db.exec("UPDATE bookings SET createdAt = startDate WHERE createdAt IS NULL");
            console.log('[DB_MIGRATE] "createdAt" column added and populated for existing bookings.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during booking creation date migration:", error);
        throw new Error("Database migration for booking createdAt failed. The application cannot start.");
    }
}

function runUserStatusMigration(db: Database.Database) {
    try {
        const columns = db.pragma('table_info(users)') as { name: string }[];
        if (!columns.some(col => col.name === 'status')) {
            console.log('[DB_MIGRATE] Adding "status" column to users...');
            db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
            console.log('[DB_MIGRATE] "status" column added to users table.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during user status migration:", error);
        throw new Error("Database migration for user status failed. The application cannot start.");
    }
}

function runUserNotesMigration(db: Database.Database) {
    try {
        const columns = db.pragma('table_info(users)') as { name: string }[];
        if (!columns.some(col => col.name === 'notes')) {
            console.log('[DB_MIGRATE] Adding "notes" column to users...');
            db.exec("ALTER TABLE users ADD COLUMN notes TEXT");
            console.log('[DB_MIGRATE] "notes" column added to users table.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during user notes migration:", error);
        throw new Error("Database migration for user notes failed. The application cannot start.");
    }
}

function runUserPhoneMigration(db: Database.Database) {
    try {
        const columns = db.pragma('table_info(users)') as { name: string }[];
        if (!columns.some(col => col.name === 'phone')) {
            console.log('[DB_MIGRATE] Adding "phone" column to users...');
            db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
            console.log('[DB_MIGRATE] "phone" column added to users table.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during user phone migration:", error);
        throw new Error("Database migration for user phone failed. The application cannot start.");
    }
}

function runInventoryModelMigration(db: Database.Database) {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS listing_inventory (
                id TEXT PRIMARY KEY,
                listingId TEXT NOT NULL,
                name TEXT NOT NULL
            );
        `);

        const bookingsColumns = db.pragma('table_info(bookings)') as { name: string }[];
        if (!bookingsColumns.some(col => col.name === 'inventoryId')) {
            console.log('[DB_MIGRATE] Adding "inventoryId" column to bookings...');
            db.exec("ALTER TABLE bookings ADD COLUMN inventoryId TEXT");
            console.log('[DB_MIGRATE] "inventoryId" column added.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during inventory model migration:", error);
        throw new Error("Database migration for inventory model failed. The application cannot start.");
    }
}

function runMultiUnitBookingMigration(db: Database.Database) {
    try {
        const columns = db.pragma('table_info(bookings)') as { name: string }[];
        // Check for old column `inventoryId` and if new column `inventoryIds` does NOT exist
        if (columns.some(col => col.name === 'inventoryId') && !columns.some(col => col.name === 'inventoryIds')) {
            console.log('[DB_MIGRATE] Applying multi-unit booking migration...');

            const transaction = db.transaction(() => {
                db.exec(`ALTER TABLE bookings RENAME TO bookings_old;`);
                db.exec(`
                    CREATE TABLE bookings (
                        id TEXT PRIMARY KEY,
                        listingId TEXT NOT NULL,
                        userId TEXT NOT NULL,
                        startDate TEXT NOT NULL,
                        endDate TEXT NOT NULL,
                        guests INTEGER NOT NULL,
                        status TEXT NOT NULL,
                        listingName TEXT,
                        createdAt TEXT,
                        actionByUserId TEXT,
                        actionAt TEXT,
                        statusMessage TEXT,
                        inventoryIds TEXT
                    );
                `);

                const copyStmt = db.prepare(`
                    INSERT INTO bookings (id, listingId, userId, startDate, endDate, guests, status, listingName, createdAt, actionByUserId, actionAt, statusMessage, inventoryIds)
                    SELECT 
                        id, listingId, userId, startDate, endDate, guests, status, listingName, createdAt, actionByUserId, actionAt, statusMessage, 
                        CASE 
                            WHEN inventoryId IS NOT NULL THEN json_array(inventoryId)
                            ELSE NULL
                        END
                    FROM bookings_old;
                `);
                copyStmt.run();
                
                db.exec(`DROP TABLE bookings_old;`);
            });

            transaction();
            console.log('[DB_MIGRATE] Multi-unit booking migration successful.');
        }
    } catch (error) {
        console.error("[DB_MIGRATE_ERROR] Critical error during multi-unit booking migration:", error);
        throw new Error("Database migration for multi-unit bookings failed. The application cannot start.");
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
        runBookingCreationDateMigration(db);
        runUserStatusMigration(db);
        runUserNotesMigration(db);
        runUserPhoneMigration(db);
        runInventoryModelMigration(db);
        runMultiUnitBookingMigration(db);

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
