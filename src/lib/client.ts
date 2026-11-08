"use client";

export async function api<T = unknown>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET", payload?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error;
    if (message) throw new Error(message);
    if (res.status === 502 || res.status === 504)
      throw new Error("The server took too long to respond. Try again in a moment.");
    throw new Error(`Request failed (${res.status})`);
  }
  return data as T;
}

export const fmtDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(undefined, opts) : "";

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function refreshWorkspaceCounts() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("workspace:refresh-counts"));
  }
}

