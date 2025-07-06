
import Database from 'better-sqlite3';
import { scrypt } from 'scrypt-js';
import { listings, bookings, users } from './placeholder-data';

let db: Database.Database;

export function getDb() {
  if (!db) {
    db = new Database('data.db');
    db.pragma('journal_mode = WAL');
    setupDb();
  }
  return db;
}

async function setupDb() {
    // Create tables if they don't exist
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'guest'
    );

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
    );

    CREATE TABLE IF NOT EXISTS bookings (
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

    // Seed users if table is empty
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (usersCount.count === 0) {
        const insertUser = db.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (@id, @name, @email, @password, @role)
        `);

        const insertUsers = db.transaction(async (usersToInsert) => {
            for (const user of usersToInsert) {
                 if (user.password) {
                    const salt = Buffer.from(Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)));
                    const key = await scrypt.scrypt(Buffer.from(user.password, 'utf-8'), salt, 16384, 8, 1, 64);
                    const hashed = `${salt.toString('hex')}:${(key as Buffer).toString('hex')}`;
                    insertUser.run({ ...user, password: hashed });
                }
            }
        });
        await insertUsers(users);
    }

    // Seed listings if table is empty
    const listingsCount = db.prepare('SELECT COUNT(*) as count FROM listings').get() as { count: number };
    if (listingsCount.count === 0) {
    const insertListing = db.prepare(`
        INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, rating, reviews, features, maxGuests)
        VALUES (@id, @name, @type, @location, @description, @images, @price, @priceUnit, @rating, @reviews, @features, @maxGuests)
    `);

    const insertListings = db.transaction((listingsToInsert) => {
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
    }

    // Seed bookings if table is empty
    const bookingsCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };
    if (bookingsCount.count === 0) {
    const insertBooking = db.prepare(`
        INSERT INTO bookings (id, listingId, userId, listingName, startDate, endDate, guests, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBookings = db.transaction((bookingsToInsert) => {
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
    }
}
