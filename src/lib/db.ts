
'use server';

import Database from 'better-sqlite3';
import { listings, bookings, users } from './placeholder-data';
import { logToFile } from './logger';
import { hashPassword } from './password';

let db: Database.Database | null = null;
let dbPromise: Promise<Database.Database> | null = null;

async function initialize() {
    const newDb = new Database('data.db');
    newDb.pragma('journal_mode = WAL');

    const marker = newDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='db_init_marker_v2'").get();
    
    if (marker) {
        await logToFile('[DB_INIT] Database already initialized with v2 schema. Skipping seeding.');
        db = newDb;
        return db;
    }

    await logToFile('[DB_INIT] No v2 init marker found. Starting fresh seed for crypto upgrade.');
    newDb.exec('DROP TABLE IF EXISTS bookings');
    newDb.exec('DROP TABLE IF EXISTS listings');
    newDb.exec('DROP TABLE IF EXISTS users');
    newDb.exec('DROP TABLE IF EXISTS db_init_marker'); // Drop old marker if it exists

    newDb.exec(`
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'guest'
    );`);
    await logToFile('[DB_INIT] Users table created.');

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
    await logToFile('[DB_INIT] Listings table created.');
    
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
    );`);
    await logToFile('[DB_INIT] Bookings table created.');

    const usersWithHashedPasswords = await Promise.all(
        users.map(async (user) => {
            if (!user.password) throw new Error(`User ${user.email} has no password in placeholder data.`);
            const hashedPassword = await hashPassword(user.password);
            return { ...user, password: hashedPassword };
        })
    );
    await logToFile('[DB_INIT] All passwords hashed successfully.');

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

    newDb.transaction(() => {
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
    })();
    await logToFile('[DB_INIT] All data seeded.');

    newDb.exec(`CREATE TABLE db_init_marker_v2 (seeded_at TEXT);`);
    newDb.prepare('INSERT INTO db_init_marker_v2 VALUES (?)').run(new Date().toISOString());
    await logToFile('[DB_INIT] V2 init marker created. Initialization complete.');

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
