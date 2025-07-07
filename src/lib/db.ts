
import Database from 'better-sqlite3';
import { listings, bookings, users } from './placeholder-data';
import { hashPassword } from './password';
import path from 'path';

// Cache the database connection promise on the global object to prevent
// re-initializing on every hot reload in development. This is crucial.
declare global {
  var dbPromise: Promise<Database.Database> | undefined;
}

const dbPath = path.join(process.cwd(), 'data.db');

async function initializeDb() {
    // better-sqlite3 creates the file if it doesn't exist.
    const db = new Database(dbPath);
    // WAL mode is recommended for performance and concurrency.
    db.pragma('journal_mode = WAL');

    // Check if the 'users' table exists. If it does, we assume the DB is seeded and ready.
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    
    if (tableCheck) {
        return db;
    }

    // --- SEEDING LOGIC ---
    // If no tables exist, this is a fresh DB that needs to be created and seeded.
    
    // Define table schemas
    db.exec(`
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'guest'
    );`);

    db.exec(`
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

    db.exec(`
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

    db.exec(`
    CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );`);

    // Prepare insert statements
    const insertUser = db.prepare(`INSERT INTO users (id, name, email, password, role) VALUES (@id, @name, @email, @password, @role)`);
    const insertListing = db.prepare(`INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, rating, reviews, features, maxGuests) VALUES (@id, @name, @type, @location, @description, @images, @price, @priceUnit, @rating, @reviews, @features, @maxGuests)`);
    const insertBooking = db.prepare(`INSERT INTO bookings (id, listingId, userId, listingName, startDate, endDate, guests, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    // Hash all user passwords before the transaction
    const usersWithHashedPasswords = await Promise.all(
        users.map(async (user) => {
            if (!user.password) throw new Error(`User ${user.email} has no password in placeholder data.`);
            const hashedPassword = await hashPassword(user.password);
            return { ...user, password: hashedPassword };
        })
    );
    
    // Seed all data within a single, synchronous transaction
    const seedTransaction = db.transaction(() => {
        for (const user of usersWithHashedPasswords) {
            insertUser.run(user);
        }
        for (const listing of listings) {
            insertListing.run({ ...listing, images: JSON.stringify(listing.images), reviews: JSON.stringify(listing.reviews), features: JSON.stringify(listing.features) });
        }
        for (const booking of bookings) {
            insertBooking.run(booking.id, booking.listingId, booking.userId, booking.listingName, booking.startDate, booking.endDate, booking.guests, booking.status);
        }
    });

    seedTransaction();

    return db;
}

// This function provides the cached promise of the database connection.
export function getDb(): Promise<Database.Database> {
  if (!globalThis.dbPromise) {
    globalThis.dbPromise = initializeDb();
  }
  return globalThis.dbPromise;
}
