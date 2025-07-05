import Database from 'better-sqlite3';
import { listings, bookings } from './placeholder-data';

// Note: Using SQLite here because it's a simple, file-based database,
// which aligns with the request for a `.db` file.
// Postgres is a more robust client-server database that requires a separate server.
export const db = new Database('data.db');
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
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
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    listingId TEXT NOT NULL,
    listingName TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    guests INTEGER NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (listingId) REFERENCES listings(id)
  );
`);

// Seed data if tables are empty
const listingsCount = db.prepare('SELECT COUNT(*) as count FROM listings').get() as { count: number };
if (listingsCount.count === 0) {
  const insertListing = db.prepare(`
    INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, rating, reviews, features, maxGuests)
    VALUES (@id, @name, @type, @location, @description, @images, @price, @priceUnit, @rating, @reviews, @features, @maxGuests)
  `);

  const insertListings = db.transaction((listings) => {
    for (const listing of listings) {
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

const bookingsCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };
if (bookingsCount.count === 0) {
  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, listingId, listingName, startDate, endDate, guests, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBookings = db.transaction((bookings) => {
    for (const booking of bookings) {
      insertBooking.run(
        booking.id,
        booking.listingId,
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
