/** Map Firebase error codes to friendly, user-facing messages. */
const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/invalid-email": "That email address is not valid.",
  "auth/weak-password": "Please choose a stronger password (at least 8 characters with a number).",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Please allow popups and retry.",
  "auth/network-request-failed": "Network error. Check your internet connection.",
  "auth/requires-recent-login": "Please sign in again to perform this action.",
  "auth/operation-not-allowed": "This sign-in method is not enabled for the project.",
  "permission-denied": "You do not have permission to do that.",
  "unavailable": "Firebase is unreachable. Check your connection.",
  "failed-precondition": "This action needs the database index or configuration to be deployed.",
  "resource-exhausted": "Too many requests. Please slow down and try again.",
  "functions/not-found": "Backend function is not deployed yet.",
  "functions/unauthenticated": "Please sign in to continue.",
  "functions/failed-precondition": "The backend rejected this request. Check your details.",
  "storage/unauthorized": "You do not have permission to upload this file.",
  "storage/canceled": "Upload cancelled.",
  "storage/quota-exceeded": "Storage quota exceeded.",
};

export function getFriendlyError(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";
  const code = (error as { code?: string }).code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code && MESSAGES[code.replace(/^functions\//, "")]) return MESSAGES[code.replace(/^functions\//, "")];
  const message = (error as { message?: string }).message;
  if (code) return message ? message.replace(/^Firebase: /, "").replace(/\s*\(.*\)$/, "") : code;
  return message || "Something went wrong. Please try again.";
}
