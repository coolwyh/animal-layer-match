import { Color } from 'cc';

export function hexColor(hex: string, alpha = 255): Color {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return new Color(r, g, b, alpha);
}
