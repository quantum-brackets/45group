import type { Listing, Booking, User } from './types';

export const users: User[] = [
    { id: '101', name: 'Admin User', email: 'admin@45group.org', password: 'password', role: 'admin' },
    { id: '102', name: 'Guest User', email: 'guest@45group.org', password: 'password', role: 'guest' },
    { id: '103', name: 'Staff User', email: 'staff@45group.org', password: 'password', role: 'staff' },
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

export const bookings: Booking[] = [
    { id: '1001', listingId: '1', userId: '102', listingName: 'Grand Hyatt Hotel', startDate: '2024-08-15', endDate: '2024-08-18', guests: 2, status: 'Confirmed' },
    { id: '1002', listingId: '2', userId: '101', listingName: 'The Lighthouse Events', startDate: '2024-09-01', endDate: '2024-09-01', guests: 150, status: 'Pending' },
];
