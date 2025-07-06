
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
    // Drop existing tables to ensure a clean slate for seeding
    db.exec(`
        DROP TABLE IF EXISTS bookings;
        DROP TABLE IF EXISTS listings;
        DROP TABLE IF EXISTS users;
    `);

    // Create tables
    db.exec(`
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'guest'
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

    // --- Seed Data ---

    // Seed Users
    const usersWithHashedPasswords = [];
    for (const user of users) {
        if (user.password) {
            const salt = Buffer.from(Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)));
            const key = await scrypt.scrypt(Buffer.from(user.password, 'utf-8'), salt, 16384, 8, 1, 64);
            const hashedPassword = `${salt.toString('hex')}:${(key as Buffer).toString('hex')}`;
            usersWithHashedPasswords.push({ ...user, password: hashedPassword });
        }
    }
    
    const insertUser = db.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (@id, @name, @email, @password, @role)
    `);

    const insertUsers = db.transaction((usersToInsert) => {
        for (const user of usersToInsert) {
            insertUser.run(user);
        }
    });

    insertUsers(usersWithHashedPasswords);


    // Seed Listings
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

    // Seed Bookings
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
