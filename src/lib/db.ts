
import Database from 'better-sqlite3';
import { listings, bookings, users } from './placeholder-data';
import { logToFile } from './logger';
import { hashPassword } from './password';

let db: Database.Database | null = null;
let dbPromise: Promise<Database.Database> | null = null;

async function initialize() {
    const newDb = new Database('data.db');
    newDb.pragma('journal_mode = WAL');

    // Check if tables exist
    const tableCheck = newDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

    if (tableCheck) {
        const resetFlag = newDb.prepare("SELECT count(*) as count FROM pragma_table_info('users') WHERE name = 'reset_flag'").get() as { count: number };
        if (!resetFlag || resetFlag.count === 0) {
            await logToFile('[DB_INIT] Database already seeded and not marked for reset. Skipping seeding.');
            db = newDb;
            return db;
        }
        await logToFile('[DB_INIT] Reset flag found or table structure is old. Dropping all tables for reseeding.');
        newDb.exec('DROP TABLE IF EXISTS bookings');
        newDb.exec('DROP TABLE IF EXISTS listings');
        newDb.exec('DROP TABLE IF EXISTS users');
        newDb.exec('DROP TABLE IF EXISTS temp_users;');
    }

    await logToFile('[DB_INIT] Database not found or empty. Starting seeding process...');
    
    // Create users and listings tables first
    newDb.exec(`
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'guest',
        reset_flag INTEGER DEFAULT 1
    );

    CREATE TABLE listings (
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
    );
    `);
    await logToFile('[DB_INIT] Users and Listings tables created.');

    // Step 1: Perform all async operations (password hashing) first.
    const usersWithHashedPasswords = [];
    for (const user of users) {
        if (user.password) {
            const hashedPassword = await hashPassword(user.password);
            usersWithHashedPasswords.push({ ...user, password: hashedPassword });
        }
    }
    await logToFile('[DB_INIT] All passwords hashed.');

    // Step 2: Insert users and listings data
    try {
        const insertUser = newDb.prepare(`
            INSERT INTO users (id, name, email, password, role)
            VALUES (@id, @name, @email, @password, @role)
        `);
        for (const user of usersWithHashedPasswords) {
            insertUser.run(user);
        }

        const insertListing = newDb.prepare(`
            INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, rating, reviews, features, maxGuests)
            VALUES (@id, @name, @type, @location, @description, @images, @price, @priceUnit, @rating, @reviews, @features, @maxGuests)
        `);
        for (const listing of listings) {
            insertListing.run({
                ...listing,
                images: JSON.stringify(listing.images),
                reviews: JSON.stringify(listing.reviews),
                features: JSON.stringify(listing.features),
            });
        }
        await logToFile('[DB_INIT] Users and listings seeded successfully.');
    } catch(err) {
        const error = err as Error;
        await logToFile(`[DB_INIT] Seeding users/listings failed: ${error.message}`);
        throw error;
    }
    
    // Step 3: Recreate users table without the reset_flag to finalize
    await logToFile('[DB_INIT] Finalizing users table schema.');
    newDb.exec('DROP TABLE IF EXISTS temp_users;');
    newDb.exec(`
        CREATE TABLE temp_users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'guest'
        );
    `);
    newDb.exec(`
        INSERT INTO temp_users (id, name, email, password, role)
        SELECT id, name, email, password, role FROM users;
    `);
    newDb.exec('DROP TABLE users;');
    newDb.exec('ALTER TABLE temp_users RENAME TO users;');
    await logToFile('[DB_INIT] Reset flag removed. Users table finalized.');
    
    // Step 4: Create and seed bookings table now that users and listings tables are stable
    newDb.exec(`
    CREATE TABLE bookings (
        id TEXT PRIMARY KEY,
        listingId TEXT NOT NULL,
        userId TEXT NOT NULL,
        listingName TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        guests INTEGER NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (listingId) REFERENCES listings(id),
        FOREIGN KEY (userId) REFERENCES users(id)
    );
    `);
    await logToFile('[DB_INIT] Bookings table created.');

    try {
        const insertBooking = newDb.prepare(`
            INSERT INTO bookings (id, listingId, userId, listingName, startDate, endDate, guests, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const booking of bookings) {
            insertBooking.run(
                booking.id,
                booking.listingId,
                booking.userId,
                booking.listingName,
                booking.startDate,
                booking.endDate,
                booking.guests,
                booking.status
            );
        }
        await logToFile('[DB_INIT] Bookings seeded successfully.');
    } catch (err) {
        const error = err as Error;
        await logToFile(`[DB_INIT] Seeding bookings failed: ${error.message}`);
        throw error;
    }
    
    await logToFile('[DB_INIT] Database seeding complete.');
    
    db = newDb;
    return db;
}

export function getDb(): Promise<Database.Database> {
  if (db) {
    return Promise.resolve(db);
  }
  if (!dbPromise) {
    dbPromise = initialize();
  }
  return dbPromise;
}
