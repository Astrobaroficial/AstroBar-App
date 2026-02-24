import { db } from '../db';
import { systemSettings } from '@shared/schema-mysql';
import { eq } from 'drizzle-orm';

interface DeliveryConfig {
  baseFee: number;
  perKm: number;
  minFee: number;
  maxFee: number;
  speedKmPerMin: number;
  defaultPrepTime: number;
}

let cachedConfig: DeliveryConfig | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000;

export async function getDeliveryConfig(): Promise<DeliveryConfig> {
  const now = Date.now();
  
  if (cachedConfig && (now - lastFetch) < CACHE_TTL) {
    return cachedConfig;
  }

  const settings = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.category, 'delivery'));

  const config: DeliveryConfig = {
    baseFee: 15,
    perKm: 8,
    minFee: 15,
    maxFee: 40,
    speedKmPerMin: 0.5,
    defaultPrepTime: 20,
  };

  settings.forEach((setting) => {
    const value = parseFloat(setting.value);
    switch (setting.key) {
      case 'delivery_base_fee':
        config.baseFee = value;
        break;
      case 'delivery_per_km':
        config.perKm = value;
        break;
      case 'delivery_min_fee':
        config.minFee = value;
        break;
      case 'delivery_max_fee':
        config.maxFee = value;
        break;
      case 'delivery_speed_km_per_min':
        config.speedKmPerMin = value;
        break;
      case 'delivery_default_prep_time':
        config.defaultPrepTime = value;
        break;
    }
  });

  cachedConfig = config;
  lastFetch = now;
  return config;
}

export function clearDeliveryConfigCache() {
  cachedConfig = null;
}
