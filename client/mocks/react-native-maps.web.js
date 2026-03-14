import React from 'react';
import { View, Text } from 'react-native';

// Mock components for web
export const MapView = ({ children, ...props }) => (
  <View style={{ width: '100%', height: '100%', backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }}>
    <Text>Mapa no disponible en web</Text>
    {children}
  </View>
);

export const Marker = () => null;
export const Circle = () => null;
export const Polyline = () => null;
export const Polygon = () => null;
export const PROVIDER_GOOGLE = 'google';

export default MapView;
