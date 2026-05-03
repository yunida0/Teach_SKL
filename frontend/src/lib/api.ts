export const PHP_BASE = "/php";
export const API_AUTH = `${PHP_BASE}/backend/auth/api`;

export async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  return (await response.json()) as T;
}
