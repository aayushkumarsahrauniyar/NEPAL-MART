"use client";

import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { uploadBytesResumable as _typeCheck } from "firebase/storage";
import { getStorageClient } from "@/lib/firebase/client";
import { STORAGE_LIMITS } from "@/lib/constants";

export class UploadValidationError extends Error { }

/** Validate before touching the network so users get an instant, clear error. */
export function validateImageFile(file: { size: number; type: string; name?: string }): string | null {
  if (!file) return "No file selected.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > STORAGE_LIMITS.maxBytes) return "Images must be 5 MB or smaller.";
  if (!STORAGE_LIMITS.allowedTypes.includes(file.type)) {
    return "Only JPEG, PNG, WebP or AVIF images are allowed.";
  }
  return null;
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildImagePath(folder: string, name: string): string {
  const stamp = Date.now();
  return `${folder.replace(/^\/+|\/+$/g, "")}/${stamp}-${safeName(name)}`;
}

export async function uploadImage(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<{ url: string; path: string }> {
  const error = validateImageFile(file);
  if (error) throw new UploadValidationError(error);

  const path = buildImagePath(folder, file.name);
  const storageRef = ref(getStorageClient(), path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type, cacheControl: "public,max-age=31536000" });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}

export async function deleteImage(path: string): Promise<void> {
  if (!path) return;
  await deleteObject(ref(getStorageClient(), path));
}
