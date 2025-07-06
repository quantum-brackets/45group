
import Database from 'better-sqlite3';
import { listings, bookings, users } from './placeholder-data';
import { hashPassword } from './password';
import path from 'path';
import fs from 'fs';

// This is a common pattern to cache a database connection
// across Next.js hot reloads or in serverless environments.
declare global {
  var dbPromise: Promise<Database.Database> | undefined;
}

const dbPath = path.join(process.cwd(), 'data.db');

async function initialize() {
    console.log(`[DB_INIT] Initializing database at: ${dbPath}`);
    const newDb = new Database(dbPath);
    newDb.pragma('journal_mode = WAL');

    // Check if the users table already exists to determine if we need to seed.
    // This is more robust than a custom marker table for development environments.
    const tableCheck = newDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    
    if (tableCheck) {
        console.log('[DB_INIT] Database tables already exist. Skipping seeding.');
        return newDb;
    }

    console.log('[DB_INIT] No existing tables found. Initializing and seeding database.');

    // Drop tables just in case of a partial, failed initialization
    newDb.exec('DROP TABLE IF EXISTS sessions');
    newDb.exec('DROP TABLE IF EXISTS bookings');
    newDb.exec('DROP TABLE IF EXISTS listings');
    newDb.exec('DROP TABLE IF EXISTS users');

    newDb.exec(`
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'guest'
    );`);
    console.log('[DB_INIT] Users table created.');

    newDb.exec(`
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
    );`);
    console.log('[DB_INIT] Listings table created.');

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
        FOREIGN KEY (listingId) REFERENCES listings (id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );`);
    console.log('[DB_INIT] Bookings table created.');

    newDb.exec(`
    CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );
    `);
    console.log('[DB_INIT] Sessions table created.');

    const usersWithHashedPasswords = await Promise.all(
        users.map(async (user) => {
            if (!user.password) throw new Error(`User ${user.email} has no password in placeholder data.`);
            const hashedPassword = await hashPassword(user.password);
            return { ...user, password: hashedPassword };
        })
    );
    console.log('[DB_INIT] All passwords hashed successfully.');

    const insertUser = newDb.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (@id, @name, @email, @password, @role)
    `);

    const insertListing = newDb.prepare(`
        INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, rating, reviews, features, maxGuests)
        VALUES (@id, @name, @type, @location, @description, @images, @price, @priceUnit, @rating, @reviews, @features, @maxGuests)
    `);

    const insertBooking = newDb.prepare(`
        INSERT INTO bookings (id, listingId, userId, listingName, startDate, endDate, guests, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedTransaction = newDb.transaction(() => {
        for (const user of usersWithHashedPasswords) {
            insertUser.run(user);
        }
        for (const listing of listings) {
            insertListing.run({
                ...listing,
                images: JSON.stringify(listing.images),
                reviews: JSON.stringify(listing.reviews),
                features: JSON.stringify(listing.features),
            });
        }
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
    });

    seedTransaction();
    console.log('[DB_INIT] All data seeded. Initialization complete.');

    return newDb;
}

// By caching the database promise on the global object, we avoid re-initializing
// the database on every request, which is crucial in a development environment
// with hot-reloading, and a good practice for serverless environments as well.
// This single, unified approach is more robust than splitting the logic for
// production and development.
export async function getDb(): Promise<Database.Database> {
  if (!globalThis.dbPromise) {
    globalThis.dbPromise = initialize();
  }
  return globalThis.dbPromise;
}
