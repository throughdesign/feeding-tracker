import { useEffect } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

const PREFIX = "isaac-feeding:draft:";
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

/** Reads a saved draft for a new entry, ignoring stale or unreadable ones. */
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { savedAt, values } = JSON.parse(raw) as { savedAt: number; values: T };
    return Date.now() - savedAt < MAX_AGE_MS ? values : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Storage unavailable (private mode); drafts are a convenience only.
  }
}

/** Saves unsent form input locally so it survives an accidental reload. */
export function useDraft<T extends FieldValues>(key: string | null, form: UseFormReturn<T>): void {
  useEffect(() => {
    if (!key) return;
    const subscription = form.watch((values) => {
      if (!form.formState.isDirty) return;
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), values }));
      } catch {
        // Ignore quota or privacy errors.
      }
    });
    return () => subscription.unsubscribe();
  }, [key, form]);
}
