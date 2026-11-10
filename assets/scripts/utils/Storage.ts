import { sys } from 'cc';

const PREFIX = 'alm_';

export function loadBool(key: string, fallback: boolean): boolean {
  const raw = sys.localStorage.getItem(PREFIX + key);
  if (raw === null || raw === undefined) return fallback;
  return raw === '1' || raw === 'true';
}

export function saveBool(key: string, value: boolean): void {
  sys.localStorage.setItem(PREFIX + key, value ? '1' : '0');
}

export function loadNumber(key: string, fallback: number): number {
  const raw = sys.localStorage.getItem(PREFIX + key);
  if (raw === null || raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function saveNumber(key: string, value: number): void {
  sys.localStorage.setItem(PREFIX + key, String(value));
}

export function loadString(key: string, fallback: string): string {
  const raw = sys.localStorage.getItem(PREFIX + key);
  return raw ?? fallback;
}

export function saveString(key: string, value: string): void {
  sys.localStorage.setItem(PREFIX + key, value);
}
