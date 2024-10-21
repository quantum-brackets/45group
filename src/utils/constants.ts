export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30  days

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?^&£#.])[A-Za-z\d@$!%*?^&£#.]{8,}$/;

export const DEFAULT_CURRENCY_CODE = "ngn";

export const JWT_KEY = "_jwt";

// export const phoneRegExp = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
export const phoneRegExp = /^[0-9]{11}$/;

export const HEADER_DATA_KEY = "x-data";
