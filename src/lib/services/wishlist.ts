"use client";

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";

const WISHLISTS = "wishlists";

export function wishlistDocRef(uid: string) {
  return doc(getDb(), WISHLISTS, uid);
}

export async function getWishlist(uid: string): Promise<string[]> {
  const snap = await getDoc(wishlistDocRef(uid));
  return snap.exists() ? ((snap.data().productIds as string[]) ?? []) : [];
}

export function subscribeToWishlist(uid: string, cb: (ids: string[]) => void) {
  return onSnapshot(wishlistDocRef(uid), (snap) => {
    cb(snap.exists() ? ((snap.data().productIds as string[]) ?? []) : []);
  });
}

export async function saveWishlist(uid: string, productIds: string[]): Promise<void> {
  await setDoc(
    wishlistDocRef(uid),
    { userId: uid, productIds, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
    { merge: true }
  );
}

export function toggleWishlistId(ids: string[], productId: string): string[] {
  return ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId];
}
