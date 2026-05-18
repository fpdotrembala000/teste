// Generic helpers used across the app.

export function classNames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// Normalize a string for fuzzy matching (lowercase, remove accents/punct).
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Simple similarity score between two strings (0..1).
export function similarity(a: string, b: string): number {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  // Token overlap (Jaccard).
  const ta = new Set(A.split(" "));
  const tb = new Set(B.split(" "));
  const inter = new Set([...ta].filter((x) => tb.has(x)));
  const union = new Set([...ta, ...tb]);
  return inter.size / union.size;
}

// Extract a Spotify playlist ID from a URL or URI.
export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  // spotify:playlist:ID
  const uri = input.match(/spotify:playlist:([A-Za-z0-9]+)/);
  if (uri) return uri[1];
  // https://open.spotify.com/playlist/ID?...
  const url = input.match(/playlist\/([A-Za-z0-9]+)/);
  if (url) return url[1];
  // Bare ID
  if (/^[A-Za-z0-9]{15,}$/.test(input.trim())) return input.trim();
  return null;
}

// Try to parse JSON from raw model output (handles ```json fences).
export function safeParseJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let text = raw.trim();
  // Strip code fences.
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "");
  // Try direct parse.
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to grab the first JSON object/array in the text.
    const objMatch = text.match(/[\{\[][\s\S]*[\}\]]/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function uniqueBy<T>(arr: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = key(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function decadeOf(year?: number): string {
  if (!year || isNaN(year)) return "Desconhecido";
  const d = Math.floor(year / 10) * 10;
  return `${d}s`;
}
