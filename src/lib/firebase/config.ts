/**
 * Firebase web configuration.
 *
 * These values are public identifiers (they ship in every Firebase web app
 * bundle). Access control is enforced by Firestore/Storage security rules and
 * Cloud Functions — never by hiding these values.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCokHhHdfykq-FkLwV5zgi5AOCoaW4R8LY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "mt-mart-2b95d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "mt-mart-2b95d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "mt-mart-2b95d.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "121730877408",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:121730877408:web:42548d6e95530eb99e8d85",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-4GYM4DW3G9",
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
