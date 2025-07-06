
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
    }

    await logToFile('[DB_INIT] Database not found or empty. Starting seeding process...');
    
    // Create tables
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
    await logToFile('[DB_INIT] Tables created.');

    // --- Seed Data ---
    
    // Seed Users
    const usersWithHashedPasswords = [];
    for (const user of users) {
        if (user.password) {
            await logToFile(`[DB_INIT] Hashing password for user: ${user.email}`);
            const hashedPassword = await hashPassword(user.password);
            usersWithHashedPasswords.push({ ...user, password: hashedPassword });
        }
    }
    
    const insertUser = newDb.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (@id, @name, @email, @password, @role)
    `);

    const insertUsers = newDb.transaction((usersToInsert) => {
        for (const user of usersToInsert) {
            insertUser.run(user);
        }
    });

    insertUsers(usersWithHashedPasswords);
    await logToFile('[DB_INIT] Users table seeded.');


    // Seed Listings
    const insertListing = newDb.prepare(`
        INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, rating, reviews, features, maxGuests)
        VALUES (@id, @name, @type, @location, @description, @images, @price, @priceUnit, @rating, @reviews, @features, @maxGuests)
    `);

    const insertListings = newDb.transaction((listingsToInsert) => {
        for (const listing of listingsToInsert) {
        insertListing.run({
            ...listing,
            images: JSON.stringify(listing.images),
            reviews: JSON.stringify(listing.reviews),
            features: JSON.stringify(listing.features),
        });
        }
    });

    insertListings(listings);
    await logToFile('[DB_INIT] Listings table seeded.');

    // Seed Bookings
    const insertBooking = newDb.prepare(`
        INSERT INTO bookings (id, listingId, userId, listingName, startDate, endDate, guests, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBookings = newDb.transaction((bookingsToInsert) => {
        for (const booking of bookingsToInsert) {
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

    insertBookings(bookings);
    await logToFile('[DB_INIT] Bookings table seeded.');
    
    // Remove reset_flag column after seeding
    newDb.exec('DROP TABLE IF EXISTS temp_users');
    newDb.exec('CREATE TABLE temp_users AS SELECT id, name, email, password, role FROM users');
    newDb.exec('DROP TABLE users');
    newDb.exec('ALTER TABLE temp_users RENAME TO users');
    await logToFile('[DB_INIT] Reset flag removed. Database seeding complete.');
    
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
