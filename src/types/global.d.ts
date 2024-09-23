type Booking = {
  id: string;
  images: string[];
  name: string;
  type: BookingType;
  city: string;
  group: BookingGroup;
  from: string;
  to: string;
  amount: number;
  inventory_quantity: number;
};

type BookingType = "rooms" | "events" | "dining";

type BookingGroup = Record<"adults" | "children" | "seniors", number>;

type BookingSearchParams = {
  q?: string;
  type?: string;
  city?: string;
  group?: string;
  from?: string;
  to?: string;
  sort_by?: string;
};
