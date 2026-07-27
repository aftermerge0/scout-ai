import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Treat null/undefined list fields from older API payloads as empty arrays. */
export function asArray<T>(value: T[] | null | undefined): T[] {
  return value ?? []
}
