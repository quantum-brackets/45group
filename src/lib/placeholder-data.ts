import type { Listing, Booking, User } from './types';

export const users: User[] = [
    { id: 'user-admin-1', name: 'Admin User', email: 'admin@45group.org', password: 'password', role: 'admin' },
    { id: 'user-guest-1', name: 'Guest User', email: 'guest@45group.org', password: 'password', role: 'guest' },
];

export const listings: Listing[] = [
  {
    id: '1',
    name: 'Grand Hyatt Hotel',
    type: 'hotel',
    location: 'New York, NY',
    description: 'A luxurious hotel in the heart of Manhattan with stunning city views. Perfect for both business and leisure travelers.',
    images: [
      'https://placehold.co/800x600.png',
      'https://placehold.co/800x600.png',
      'https://placehold.co/800x600.png',
    ],
    price: 350,
    priceUnit: 'night',
    rating: 4.8,
    reviews: [
      { id: 'r1', author: 'John Doe', avatar: 'https://placehold.co/100x100.png', rating: 5, comment: 'Amazing experience! The staff was incredibly friendly and the room was pristine.' },
      { id: 'r2', author: 'Jane Smith', avatar: 'https://placehold.co/100x100.png', rating: 4, comment: 'Great location and beautiful views. The breakfast could be better.' },
    ],
    features: ['Free WiFi', 'Pool', 'Gym', 'Pet Friendly'],
    maxGuests: 4,
  },
  {
    id: '2',
    name: 'The Lighthouse Events',
    type: 'events',
    location: 'San Francisco, CA',
    description: 'A modern and spacious events venue perfect for weddings, conferences, and corporate events. Features state-of-the-art AV equipment.',
    images: [
      'https://placehold.co/800x600.png',
      'https://placehold.co/800x600.png',
    ],
    price: 500,
    priceUnit: 'hour',
    rating: 4.9,
    reviews: [
      { id: 'r3', author: 'Event Planners Inc.', avatar: 'https://placehold.co/100x100.png', rating: 5, comment: 'Our go-to venue for all major corporate events. Flawless execution every time.' },
    ],
    features: ['AV Equipment', 'Catering Available', 'Parking', ' breakout rooms'],
    maxGuests: 200,
  }
];

export const bookings: Omit<Booking, 'listingName'>[] = [
    { id: 'b1', listingId: '1', userId: 'user-guest-1', startDate: '2024-08-15', endDate: '2024-08-18', guests: 2, status: 'Confirmed' },
    { id: 'b2', listingId: '2', userId: 'user-admin-1', startDate: '2024-09-01', endDate: '2024-09-01', guests: 150, status: 'Pending' },
].map(b => {
    const listing = listings.find(l => l.id === b.listingId);
    return { ...b, listingName: listing!.name };
});
