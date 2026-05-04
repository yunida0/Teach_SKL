const configuredPhpBase = process.env.NEXT_PUBLIC_PHP_BASE;
const isLocalBrowser =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const PHP_BASE = configuredPhpBase ?? (isLocalBrowser ? "/php" : "");
export const API_AUTH = `${PHP_BASE}/backend/auth/api`;

export async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  return (await response.json()) as T;
}

export function uploadWithProgress<T>(
  url: string,
  data: FormData,
  onProgress: (progress: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-Requested-With", "fetch");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onload = () => {
      onProgress(100);
      const text = xhr.responseText || "";
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = { success: false, error: text.trim().slice(0, 180) || "Upload gagal." };
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
        return;
      }
      reject(payload);
    };
    xhr.onerror = () => reject({ success: false, error: "Koneksi upload terputus." });
    xhr.onabort = () => reject({ success: false, error: "Upload dibatalkan." });
    xhr.send(data);
  });
}
