export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string>; status: number };

/** Kleiner Fetch-Wrapper für Client-Komponenten (JSON rein/raus). */
export async function apiFetch<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Unbekannter Fehler", fields: data.fields, status: res.status };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Netzwerkfehler – bitte prüfe deine Verbindung.", status: 0 };
  }
}
