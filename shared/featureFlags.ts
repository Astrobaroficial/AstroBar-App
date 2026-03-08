// Feature Flags - Control de módulos activados/desactivados
export const FEATURE_FLAGS = {
  // MVP - Siempre activos
  MVP_REGISTRATION: true,
  MVP_MAP: true,
  MVP_PROMOTIONS: true,
  MVP_CART: true,
  MVP_PAYMENTS: true,
  MVP_QR: true,
  MVP_POINTS: true,

  // FASE 2 - Activados
  REFERRAL_SYSTEM: true,
  DEMAND_HEATMAP: true,
  ADMIN_ADVANCED: true,
  MULTIMEDIA_CONTENT: true,
  INVITATION_LINKS: true,
  DYNAMIC_MESSAGES: true,
  BAR_RANKING: true,
  SCHEDULED_PROMOS: true,
};

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURE_FLAGS[feature] === true;
};
