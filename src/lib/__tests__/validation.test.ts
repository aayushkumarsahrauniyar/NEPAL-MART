import { describe, expect, it } from "vitest";
import { strict as assert } from "node:assert";

import {
  escapeRegExp,
  hasErrors,
  isValidEmail,
  isValidNepaliPhone,
  isValidSKU,
  normalizePhone,
  slugify,
  validateAddress,
  validateName,
  validatePassword,
  validatePostalCode,
  validateRequired,
} from "@/lib/validation";

describe("isValidEmail", () => {
  it.each([
    ["simple", "ram@example.com"],
    ["plus addressing", "ram+bahadur@example.com"],
    ["sub-domain", "ops@mail.nepalmart.com.np"],
    ["surrounding whitespace", "  ram@example.com  "],
    ["single-letter local and tld", "a@b.co"],
  ])("accepts a valid email (%s)", (_case, value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each([
    ["empty string", ""],
    ["only whitespace", "   "],
    ["missing @", "ram.example.com"],
    ["missing local part", "@example.com"],
    ["missing domain", "ram@"],
    ["missing dot in domain", "ram@example"],
    ["two @ signs", "ram@@example.com"],
    ["space inside", "ram bahadur@example.com"],
    ["dot directly after @", "ram@.example.com"],
    ["trailing dot", "ram@example."],
  ])("rejects an invalid email (%s)", (_case, value) => {
    expect(isValidEmail(value)).toBe(false);
  });

  it("rejects an email longer than 254 characters", () => {
    const local = "a".repeat(245);
    expect(isValidEmail(`${local}@example.com`)).toBe(false);
  });

  it("accepts an email of exactly 254 characters", () => {
    const local = "a".repeat(242);
    const email = `${local}@example.com`;
    expect(email).toHaveLength(254);
    expect(isValidEmail(email)).toBe(true);
  });

  it("returns false for non-string input", () => {
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
    expect(isValidEmail(12345 as unknown as string)).toBe(false);
  });
});

describe("isValidNepaliPhone", () => {
  it.each([
    ["plain 98 number", "9812345678"],
    ["plain 97 number", "9712345678"],
    ["plain 96 number", "9612345678"],
    ["+977 prefix", "+9779812345678"],
    ["977 prefix", "9779812345678"],
    ["spaces", "981 234 5678"],
    ["dashes", "981-234-5678"],
    ["+977 with spaces", "+977 981 234 5678"],
  ])("accepts %s", (_case, value) => {
    expect(isValidNepaliPhone(value)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["too short", "981234567"],
    ["too long", "98123456789"],
    ["starts with 95", "9512345678"],
    ["starts with 99", "9912345678"],
    ["does not start with 9", "8812345678"],
    ["landline with area code", "014234567"],
    ["letters", "98abc45678"],
    ["other country code", "+911234567890"],
  ])("rejects %s", (_case, value) => {
    expect(isValidNepaliPhone(value)).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isValidNepaliPhone(null as unknown as string)).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("strips spaces, dashes and parentheses", () => {
    expect(normalizePhone("(981) 234-5678")).toBe("9812345678");
  });

  it("removes a +977 country code when the number has 13 digits", () => {
    expect(normalizePhone("+977 9812345678")).toBe("9812345678");
  });

  it("removes a 977 country code when the number has 13 digits", () => {
    expect(normalizePhone("9779812345678")).toBe("9812345678");
  });

  it("keeps a 977 prefix when the number is not 13 digits long", () => {
    expect(normalizePhone("977981234")).toBe("977981234");
  });

  it("returns an empty string for null/undefined input", () => {
    expect(normalizePhone(undefined as unknown as string)).toBe("");
    expect(normalizePhone(null as unknown as string)).toBe("");
  });

  it("returns an empty string when there are no digits", () => {
    expect(normalizePhone("call me")).toBe("");
  });
});

describe("validatePassword", () => {
  it("accepts an 8 character password with a letter and a number", () => {
     mixed-case password with assert.equal(validatePassword("abcd1234"), null);
  });

  it("accepts a strongsymbols", () => {
    expect(validatePassword("Str0ng!Pass#")).toBeNull();
  });

  it("accepts a password of exactly 128 characters", () => {
    const password = "a".repeat(127) + "1";
    expect(password).toHaveLength(128);
    expect(validatePassword(password)).toBeNull();
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(validatePassword("ab1")).toBe("Password must be at least 8 characters.");
  });

  it("rejects an empty password", () => {
    expect(validatePassword("")).toBe("Password must be at least 8 characters.");
  });

  it("rejects a password longer than 128 characters", () => {
    const password = "a".repeat(128) + "1";
    expect(validatePassword(password)).toBe("Password must be at most 128 characters.");
  });

  it("rejects a password without letters", () => {
    expect(validatePassword("12345678")).toBe("Password must contain at least one letter.");
  });

  it("rejects a password without numbers", () => {
    expect(validatePassword("abcdefgh")).toBe("Password must contain at least one number.");
  });
});

describe("validateRequired", () => {
  it("returns null for a non-empty value", () => {
    expect(validateRequired("Kathmandu")).toBeNull();
  });

  it("uses the default label in the error message", () => {
    expect(validateRequired("")).toBe("This field is required.");
  });

  it("uses a custom label in the error message", () => {
    expect(validateRequired("", "Email")).toBe("Email is required.");
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "    "],
    ["tabs and newlines", "\t\n"],
  ])("rejects a %s value", (_case, value) => {
    expect(validateRequired(value)).toBe("This field is required.");
  });

  it("rejects null/undefined", () => {
    expect(validateRequired(undefined as unknown as string)).toBe("This field is required.");
    expect(validateRequired(null as unknown as string)).toBe("This field is required.");
  });
});

describe("validateName", () => {
  it("accepts a normal name", () => {
    expect(validateName("Ram Bahadur")).toBeNull();
  });

  it("accepts a two character name", () => {
    expect(validateName("Ra")).toBeNull();
  });

  it("accepts a name of exactly 80 characters", () => {
    expect(validateName("a".repeat(80))).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateName("")).toBe("Full name is required.");
  });

  it("rejects a whitespace-only name", () => {
    expect(validateName("   ")).toBe("Full name is required.");
  });

  it("rejects a one character name", () => {
    expect(validateName("R")).toBe("Full name must be at least 2 characters.");
  });

  it("rejects a name with a single letter surrounded by spaces", () => {
    expect(validateName(" A ")).toBe("Full name must be at least 2 characters.");
  });

  it("rejects a name longer than 80 characters", () => {
    expect(validateName("a".repeat(81))).toBe("Full name must be at most 80 characters.");
  });
});

describe("validatePostalCode", () => {
  it("returns null because the field is optional", () => {
    expect(validatePostalCode("")).toBeNull();
  });

  it.each(["44600", "00000", "99999"])("accepts the 5 digit code %s", (value) => {
    expect(validatePostalCode(value)).toBeNull();
  });

  it.each([
    ["4 digits", "4460"],
    ["6 digits", "446001"],
    ["letters", "AB400"],
    ["dashes", "44-600"],
    ["spaces", " 44600"],
  ])("rejects %s", (_case, value) => {
    expect(validatePostalCode(value)).toBe("Postal code must be 5 digits.");
  });
});

describe("validateAddress", () => {
  const validAddress = {
    fullName: "Sita Sharma",
    phone: "9812345678",
    line1: "Lazimpat Road 12",
    city: "Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    postalCode: "44600",
    country: "Nepal",
  };

  it("returns no errors for a complete, valid address", () => {
    expect(validateAddress(validAddress)).toEqual({});
  });

  it("accepts an address without the optional postal code", () => {
    const { postalCode: _postalCode, ...withoutPostal } = validAddress;
    expect(validateAddress(withoutPostal)).toEqual({});
  });

  it("reports every required field on an empty address", () => {
    expect(validateAddress({})).toEqual({
      fullName: "Full name is required.",
      phone: "Enter a valid Nepali mobile number (e.g. 98XXXXXXXX).",
      line1: "Street address is required.",
      city: "City is required.",
      district: "District is required.",
      province: "Province is required.",
      country: "Country is required.",
    });
  });

  it("only reports the fields that are invalid", () => {
    const errors = validateAddress({
      ...validAddress,
      phone: "12345",
      postalCode: "abc",
    });
    expect(Object.keys(errors).sort()).toEqual(["phone", "postalCode"]);
  });

  it("validates the full name length", () => {
    expect(validateAddress({ ...validAddress, fullName: "R" }).fullName).toBe(
      "Full name must be at least 2 characters."
    );
  });

  it("accepts a +977 formatted phone", () => {
    expect(validateAddress({ ...validAddress, phone: "+977 9812345678" }).phone).toBeUndefined();
  });

  it("accepts whitespace-padded required fields", () => {
    const errors = validateAddress({ ...validAddress, city: "  Kathmandu  " });
    expect(errors.city).toBeUndefined();
  });
});

describe("hasErrors", () => {
  it("returns true when at least one error is present", () => {
    expect(hasErrors({ email: "bad", name: undefined })).toBe(true);
  });

  it("returns false when all entries are undefined or empty", () => {
    expect(hasErrors({ email: undefined, name: "", phone: undefined })).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(hasErrors({})).toBe(false);
  });
});

describe("slugify", () => {
  it.each([
    ["lowercases and hyphenates", "Basmati Rice", "basmati-rice"],
    ["collapses multiple separators", "Basmati   Rice  !!! 1kg", "basmati-rice-1kg"],
    ["trims surrounding separators", "  --Himalayan Salt--  ", "himalayan-salt"],
    ["removes apostrophes without a hyphen", "Nepal's Best Tea", "nepals-best-tea"],
    ["removes double quotes", 'The "Best" Momo', "the-best-momo"],
    ["strips non-ascii characters", "Café Crème", "caf-cr-me"],
    ["keeps digits", "iPhone 15 Pro", "iphone-15-pro"],
  ])("%s", (_case, input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("returns an empty string for an empty value", () => {
    expect(slugify("")).toBe("");
  });

  it("returns an empty string for non-string input", () => {
    expect(slugify(undefined as unknown as string)).toBe("");
  });

  it("truncates to 80 characters", () => {
    const result = slugify("a".repeat(200));
    expect(result).toHaveLength(80);
  });

  it("does not end with a hyphen after truncation", () => {
    // 79 "a" + a space + "b" -> truncating at 80 could leave a trailing hyphen
    const result = slugify(`${"a".repeat(79)} b`);
    expect(result.endsWith("-")).toBe(false);
  });
});

describe("isValidSKU", () => {
  it.each([
    ["minimum length", "AB1"],
    ["typical sku", "NM-RICE-001"],
    ["lowercase input is accepted", "nm-rice-001"],
    ["maximum length (32)", "A".repeat(32)],
  ])("accepts %s", (_case, value) => {
    expect(isValidSKU(value)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["too short", "AB"],
    ["too long (33)", "A".repeat(33)],
    ["starts with a hyphen", "-AB1"],
    ["contains underscore", "AB_1"],
    ["contains a space", "AB 1"],
    ["contains a slash", "AB/1"],
  ])("rejects %s", (_case, value) => {
    expect(isValidSKU(value)).toBe(false);
  });

  it("rejects missing values", () => {
    expect(isValidSKU(undefined as unknown as string)).toBe(false);
  });
});

describe("escapeRegExp", () => {
  it("escapes all regex special characters", () => {
    const raw = ".*+?^${}()|[]\\";
    const pattern = new RegExp(`^${escapeRegExp(raw)}$`);
    expect(pattern.test(raw)).toBe(true);
  });

  it("produces a pattern that only matches the literal text", () => {
    expect(new RegExp(escapeRegExp("a.b")).test("axb")).toBe(false);
    expect(new RegExp(escapeRegExp("a.b")).test("a.b")).toBe(true);
  });

  it("leaves plain text untouched", () => {
    expect(escapeRegExp("plain text 123")).toBe("plain text 123");
  });
});
