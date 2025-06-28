export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?^&£#.])[A-Za-z\d@$!%*?^&£#.]{8,}$/;

export const DEFAULT_CURRENCY_CODE = "ngn";

export const JWT_KEY = "_jwt";

export const SESSION_KEY = "_session";

// export const phoneRegExp = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
export const phoneRegExp = /^[0-9]{11}$/;

export const HEADER_DATA_KEY = "x-data";

export const DAY_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const SCHEDULE_TYPE = ["24/7", "custom", "weekdays", "weekends"] as const;
