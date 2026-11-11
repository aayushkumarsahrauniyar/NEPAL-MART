"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage, type Storage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { firebaseConfig } from "./config";

const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";
const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";

let emulatorsConnected = false;

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  connectToEmulators(auth);
  return auth;
}

export function getDb(): Firestore {
  const app = getFirebaseApp();
  let db: Firestore;
  try {
    // ignoreUndefinedProperties lets us write partial documents without stripping fields manually.
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    db = getFirestore(app);
  }
  connectToEmulators(undefined, db);
  return db;
}

export function getStorageClient(): Storage {
  const storage = getStorage(getFirebaseApp());
  if (useEmulators && !emulatorsConnected) {
    connectStorageEmulator(storage, emulatorHost, 9199);
  }
  return storage;
}

export function getFunctionsClient(): Functions {
  const functions = getFunctions(getFirebaseApp());
  if (useEmulators) {
    connectFunctionsEmulator(functions, emulatorHost, 5001);
  }
  return functions;
}

function connectToEmulators(auth?: Auth, db?: Firestore) {
  if (!useEmulators || emulatorsConnected) return;
  if (typeof window === "undefined") return;
  if (auth) connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  if (db) connectFirestoreEmulator(db, emulatorHost, 8080);
  emulatorsConnected = true;
}

/**
 * Load Firebase Analytics lazily and only in a supported browser environment.
 * Analytics is not available during SSR or in browsers without indexDB.
 */
export async function initAnalyticsSafe(): Promise<void> {
  if (typeof window === "undefined" || useEmulators) return;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) getAnalytics(getFirebaseApp());
  } catch {
    // Analytics is optional; never break the app because of it.
  }
}
