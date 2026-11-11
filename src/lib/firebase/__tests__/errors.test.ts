import { describe, expect, it } from "vitest";

import { getFriendlyError } from "@/lib/firebase/errors";

const FALLBACK = "Something went wrong. Please try again.";

describe("getFriendlyError", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["zero", 0],
  ])("returns the fallback message for %s", (_case, value) => {
    expect(getFriendlyError(value)).toBe(FALLBACK);
  });

  it.each([
    ["auth/email-already-in-use", "An account with this email already exists. Try signing in instead."],
    ["auth/invalid-email", "That email address is not valid."],
    ["auth/weak-password", "Please choose a stronger password (at least 8 characters with a number)."],
    ["auth/user-not-found", "No account found with this email."],
    ["auth/wrong-password", "Incorrect email or password."],
    ["auth/invalid-credential", "Incorrect email or password."],
    ["auth/too-many-requests", "Too many attempts. Please wait a moment and try again."],
    ["auth/popup-closed-by-user", "Sign-in popup was closed before completing."],
    ["auth/popup-blocked", "Your browser blocked the sign-in popup. Please allow popups and retry."],
    ["auth/network-request-failed", "Network error. Check your internet connection."],
    ["auth/requires-recent-login", "Please sign in again to perform this action."],
    ["auth/operation-not-allowed", "This sign-in method is not enabled for the project."],
    ["permission-denied", "You do not have permission to do that."],
    ["unavailable", "Firebase is unreachable. Check your connection."],
    [
      "failed-precondition",
      "This action needs the database index or configuration to be deployed.",
    ],
    ["resource-exhausted", "Too many requests. Please slow down and try again."],
    ["functions/not-found", "Backend function is not deployed yet."],
    ["functions/unauthenticated", "Please sign in to continue."],
    ["functions/failed-precondition", "The backend rejected this request. Check your details."],
    ["storage/unauthorized", "You do not have permission to upload this file."],
    ["storage/canceled", "Upload cancelled."],
    ["storage/quota-exceeded", "Storage quota exceeded."],
  ])("maps the known code %s to a friendly message", (code, expected) => {
    expect(getFriendlyError({ code })).toBe(expected);
  });

  it("maps a bare Firestore code wrapped in functions/", () => {
    // "functions/permission-denied" is not listed verbatim, so the prefix is stripped.
    expect(getFriendlyError({ code: "functions/permission-denied" })).toBe(
      "You do not have permission to do that."
    );
  });

  it("maps a bare Firestore code wrapped in firestore/ via its message", () => {
    const error = { code: "firestore/permission-denied", message: "Missing or insufficient permissions." };
    expect(getFriendlyError(error)).toBe("Missing or insufficient permissions.");
  });

  it("strips the 'Firebase: ' prefix and the trailing error details from the message", () => {
    const error = {
      code: "auth/internal-error",
      message: "Firebase: Error (auth/internal-error).",
    };
    expect(getFriendlyError(error)).toBe("Error");
  });

  it("strips only the parenthesised suffix from a multi-word message", () => {
    const error = {
      code: "auth/unknown",
      message: "Firebase: Something odd happened (auth/unknown).",
    };
    expect(getFriendlyError(error)).toBe("Something odd happened");
  });

  it("returns the raw code when an unknown code has no message", () => {
    expect(getFriendlyError({ code: "auth/some-new-code" })).toBe("auth/some-new-code");
  });

  it("returns the message when there is no code", () => {
    expect(getFriendlyError(new Error("Network down"))).toBe("Network down");
  });

  it("returns the fallback for an empty message without a code", () => {
    expect(getFriendlyError({ message: "" })).toBe(FALLBACK);
  });

  it("returns the fallback for an object with neither code nor message", () => {
    expect(getFriendlyError({})).toBe(FALLBACK);
  });

  it("returns a plain string error unchanged", () => {
    expect(getFriendlyError("boom")).toBe(FALLBACK);
  });

  it("does not leak Firebase internals such as prefixes to the user", () => {
    const result = getFriendlyError({ code: "auth/whatever", message: "Firebase: Oops (auth/whatever)." });
    expect(result).not.toContain("Firebase:");
    expect(result).not.toContain("auth/whatever");
  });
});
