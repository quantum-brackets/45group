type User = {
  first_name: string;
  last_name: string;
  email: string;
  type: "user" | "admin";
  image: string;
  phone: string;
  complete_profile: boolean;
};

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

type Resource = {
  id: string;
  name: string;
  rules: ResourceRule[];
};

type Pagination<T> = {
  count: number;
  data: T[];
};
