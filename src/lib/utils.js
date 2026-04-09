import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn() — Utility untuk menggabungkan Tailwind class secara cerdas.
 * Menghindari konflik kelas dan mendukung conditional classes.
 * Pattern dari shadcn/ui, kompatibel dengan Tailwind v4.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
