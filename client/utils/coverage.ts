/**
 * Coordenadas de cobertura de Autlán, Jalisco
 */
export const AUTLAN_BOUNDS = {
  minLat: 19.75,
  maxLat: 19.80,
  minLng: -104.40,
  maxLng: -104.30,
};

/**
 * Centro de Autlán para inicializar mapas
 */
export const AUTLAN_CENTER = {
  latitude: 19.7708,
  longitude: -104.3636,
};

/**
 * Valida si unas coordenadas están dentro de la zona de cobertura
 */
export const isInCoverageArea = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= AUTLAN_BOUNDS.minLat &&
    latitude <= AUTLAN_BOUNDS.maxLat &&
    longitude >= AUTLAN_BOUNDS.minLng &&
    longitude <= AUTLAN_BOUNDS.maxLng
  );
};
