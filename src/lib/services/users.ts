"use client";

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { Address, Role, UserProfile } from "@/lib/types";

const USERS = "users";

export async function ensureUserProfile(input: {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  emailVerified?: boolean;
}): Promise<void> {
  const ref = doc(getDb(), USERS, input.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      email: input.email,
      emailVerified: !!input.emailVerified,
      ...(input.photoURL ? { photoURL: input.photoURL } : {}),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  await setDoc(ref, {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName || input.email.split("@")[0],
    photoURL: input.photoURL ?? "",
    role: "customer" satisfies Role,
    emailVerified: !!input.emailVerified,
    status: "active",
    ordersCount: 0,
    totalSpentPaisa: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getDb(), USERS, uid));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as UserProfile) : null;
}

export function subscribeToUserProfile(uid: string, cb: (profile: UserProfile | null) => void) {
  return onSnapshot(doc(getDb(), USERS, uid), (snap) => {
    cb(snap.exists() ? ({ ...snap.data(), id: snap.id } as UserProfile) : null);
  });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "phone" | "photoURL">>
): Promise<void> {
  await updateDoc(doc(getDb(), USERS, uid), { ...data, updatedAt: serverTimestamp() });
}

export async function saveAddress(uid: string, address: Address): Promise<string> {
  const id = address.id ?? `addr_${Date.now()}`;
  const ref = doc(getDb(), USERS, uid, "addresses", id);
  const existing = await getDoc(ref);
  await setDoc(ref, {
    ...address,
    id,
    updatedAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  });
  return id;
}

export async function listAddresses(uid: string): Promise<Address[]> {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(getDb(), USERS, uid, "addresses"));
  return snap.docs.map((d) => ({ ...(d.data() as Address), id: d.id }));
}
