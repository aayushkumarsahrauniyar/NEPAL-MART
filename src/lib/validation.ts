/**
 * Pure validation helpers shared by forms (client) and Cloud Functions (server).
 * Functions return an error message string or `null` when the value is valid,
 * which keeps form wiring simple.
 */

export type FieldError = string | null;

export function isValidEmail(value: string): boolean {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (email.length === 0 || email.length > 254) return false;
  // Deliberately conservative: no spaces, exactly one @, a dot in the domain.
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email);
}

/** Nepali mobile numbers: 10 digits starting 97/98/96, optionally +977 prefixed. */
export function isValidNepaliPhone(value: string): boolean {
  if (typeof value !== "string") return false;
  const digits = value.replace(/[\s-]/g, "").replace(/^\+977/, "").replace(/^977/, "");
  return /^9[6-8]\d{8}$/.test(digits);
}

export function normalizePhone(value: string): string {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.startsWith("977") && digits.length === 13) return digits.slice(3);
  return digits;
}

export function validatePassword(value: string): FieldError {
  if (!value || value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be at most 128 characters.";
  if (!/[A-Za-z]/.test(value)) return "Password must contain at least one letter.";
  if (!/\d/.test(value)) return "Password must contain at least one number.";
  return null;
}

export function validateRequired(value: string, label = "This field"): FieldError {
  return !value || value.trim().length === 0 ? `${label} is required.` : null;
}

export function validateName(value: string): FieldError {
  const req = validateRequired(value, "Full name");
  if (req) return req;
  if (value.trim().length < 2) return "Full name must be at least 2 characters.";
  if (value.trim().length > 80) return "Full name must be at most 80 characters.";
  return null;
}

export function validatePostalCode(value: string): FieldError {
  if (!value) return null; // optional
  return /^\d{5}$/.test(value) ? null : "Postal code must be 5 digits.";
}

export interface AddressInput {
  fullName?: string;
  phone?: string;
  line1?: string;
  city?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export function validateAddress(address: AddressInput): AddressErrors {
  const errors: AddressErrors = {};
  const nameErr = validateName(address.fullName ?? "");
  if (nameErr) errors.fullName = nameErr;
  if (!isValidNepaliPhone(address.phone ?? "")) errors.phone = "Enter a valid Nepali mobile number (e.g. 98XXXXXXXX).";
  const line1 = validateRequired(address.line1 ?? "", "Street address");
  if (line1) errors.line1 = line1;
  const city = validateRequired(address.city ?? "", "City");
  if (city) errors.city = city;
  const district = validateRequired(address.district ?? "", "District");
  if (district) errors.district = district;
  if (!address.province) errors.province = "Province is required.";
  const postal = validatePostalCode(address.postalCode ?? "");
  if (postal) errors.postalCode = postal;
  if (!address.country) errors.country = "Country is required.";
  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

export function slugify(value: string): string {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidSKU(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,31}$/.test((value || "").toUpperCase());
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
