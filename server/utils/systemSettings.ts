import { db } from '../db';
import { sql } from 'drizzle-orm';

interface SystemSettings {
  max_active_bars: number;
  max_products_per_bar: number;
  max_common_promotions: number;
  max_flash_promotions: number;
  default_platform_commission: number;
  cancellation_window_seconds: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  max_active_bars: 100,
  max_products_per_bar: 80,
  max_common_promotions: 10,
  max_flash_promotions: 3,
  default_platform_commission: 0.30,
  cancellation_window_seconds: 60,
};

let cachedSettings: SystemSettings | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minuto

export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now();
  
  // Usar cache si es reciente
  if (cachedSettings && (now - lastFetch) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const result = await db.execute(sql`SELECT setting_key, value FROM system_settings`);
    const rows = Array.isArray(result[0]) ? result[0] : result;
    
    const settings = { ...DEFAULT_SETTINGS };
    
    for (const row of rows as any[]) {
      const key = row.setting_key || row.key;
      const value = row.value;
      
      if (key in settings) {
        if (key === 'default_platform_commission') {
          settings[key] = parseFloat(value);
        } else {
          settings[key] = parseInt(value);
        }
      }
    }
    
    cachedSettings = settings;
    lastFetch = now;
    return settings;
  } catch (error) {
    console.error('Error loading system settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}

export function clearSettingsCache() {
  cachedSettings = null;
  lastFetch = 0;
}
