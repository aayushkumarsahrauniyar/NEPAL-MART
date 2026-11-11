"use client";

/**
 * Content services: banners, site settings, contact messages and categories
 * administration. Kept in one module because each collection only needs a
 * couple of operations and splitting them would create duplicate boilerplate.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { Banner, Category, ContactMessage, SiteSettings } from "@/lib/types";

const BANNERS = "banners";
const SETTINGS = "settings";
const CONTACT = "contactMessages";
const CATEGORIES = "categories";

function toList<T extends { id: string }>(docs: { id: string; data: () => object }[]): T[] {
  return docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T);
}

/* ------------------------------- Banners ------------------------------- */

export async function getBanners(placement?: Banner["placement"]): Promise<Banner[]> {
  const snap = await getDocs(query(collection(getDb(), BANNERS), orderBy("order", "asc")));
  const list = toList<Banner>(snap.docs).filter((b) => b.active !== false);
  return placement ? list.filter((b) => b.placement === placement) : list;
}

export async function getAllBanners(): Promise<Banner[]> {
  const snap = await getDocs(collection(getDb(), BANNERS));
  return toList<Banner>(snap.docs);
}

export async function saveBanner(input: Partial<Banner> & { title: string; imageUrl: string; placement: Banner["placement"] }): Promise<string> {
  const data = { ...input, updatedAt: serverTimestamp() };
  if (input.id) {
    await updateDoc(doc(getDb(), BANNERS, input.id), data);
    return input.id;
  }
  const ref = await addDoc(collection(getDb(), BANNERS), { ...data, createdAt: serverTimestamp(), active: input.active ?? true });
  return ref.id;
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), BANNERS, id));
}

/* ------------------------------- Settings ------------------------------ */

export async function getSettings(): Promise<SiteSettings> {
  const snap = await getDoc(doc(getDb(), SETTINGS, "site"));
  if (!snap.exists()) return { id: "site", ...DEFAULT_SETTINGS } as SiteSettings;
  return { id: "site", ...DEFAULT_SETTINGS, ...(snap.data() as object) } as SiteSettings;
}

export async function saveSettings(input: Partial<SiteSettings>): Promise<void> {
  await setDoc(doc(getDb(), SETTINGS, "site"), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}

/* --------------------------- Contact messages -------------------------- */

export async function sendContactMessage(input: Omit<ContactMessage, "id" | "createdAt" | "status">): Promise<string> {
  const ref = await addDoc(collection(getDb(), CONTACT), {
    ...input,
    status: "new",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const snap = await getDocs(query(collection(getDb(), CONTACT), orderBy("createdAt", "desc")));
  return toList<ContactMessage>(snap.docs);
}

export async function markMessageStatus(id: string, status: ContactMessage["status"]): Promise<void> {
  await updateDoc(doc(getDb(), CONTACT, id), { status });
}

/* ------------------------------ Categories ----------------------------- */

export async function saveCategory(input: Partial<Category> & { name: string; slug: string }): Promise<string> {
  const data = { ...input, updatedAt: serverTimestamp() };
  if (input.id) {
    await updateDoc(doc(getDb(), CATEGORIES, input.id), data);
    return input.id;
  }
  const ref = await addDoc(collection(getDb(), CATEGORIES), { ...data, createdAt: serverTimestamp(), active: input.active ?? true });
  return ref.id;
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), CATEGORIES, id));
}
