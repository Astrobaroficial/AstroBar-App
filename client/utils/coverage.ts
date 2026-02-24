/**
 * Coordenadas de cobertura de Buenos Aires, Argentina
 */
export const BUENOS_AIRES_BOUNDS = {
  minLat: 19.75,
  maxLat: 19.80,
  minLng: -104.40,
  maxLng: -104.30,
};

/**
 * Centro de Buenos Aires para inicializar mapas
 */
export const BUENOS_AIRES_CENTER = {
  latitude: 19.7708,
  longitude: -104.3636,
};

/**
 * Valida si unas coordenadas están dentro de la zona de cobertura
 */
export const isInCoverageArea = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= BUENOS_AIRES_BOUNDS.minLat &&
    latitude <= BUENOS_AIRES_BOUNDS.maxLat &&
    longitude >= BUENOS_AIRES_BOUNDS.minLng &&
    longitude <= BUENOS_AIRES_BOUNDS.maxLng
  );
};
