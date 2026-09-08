import db from '../config/database';

let cache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getAllSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  const rows = await db('system_settings').select('setting_key', 'setting_value');
  const result: Record<string, string> = Object.fromEntries(rows.map((r: { setting_key: string; setting_value: string }) => [r.setting_key, r.setting_value]));
  cache = result;
  cacheTime = now;
  return cache;
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const settings = await getAllSettings();
  return settings[key] ?? fallback;
}

export async function getSettingInt(key: string, fallback: number): Promise<number> {
  const val = await getSetting(key, String(fallback));
  const parsed = parseInt(val);
  return isNaN(parsed) ? fallback : parsed;
}

export async function getSettingBool(key: string, fallback = false): Promise<boolean> {
  const val = await getSetting(key, String(fallback));
  return val === 'true';
}

export function invalidateSettingsCache(): void {
  cache = null;
}
