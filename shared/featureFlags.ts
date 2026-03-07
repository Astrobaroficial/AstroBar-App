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

  // FASE 2 - Desactivados por defecto
  REFERRAL_SYSTEM: false,
  DEMAND_HEATMAP: false,
  ADMIN_ADVANCED: false,
  MULTIMEDIA_CONTENT: false,
  INVITATION_LINKS: false,
  DYNAMIC_MESSAGES: false,
  BAR_RANKING: false,
  SCHEDULED_PROMOS: false,
};

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURE_FLAGS[feature] === true;
};
