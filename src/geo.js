// Distância e área para alertas por localização. Usa o GPS do celular (mesmo jeito do tempo).
import * as Location from 'expo-location';

const R = 6371; // raio da Terra em km

// Distância em km entre dois pontos (fórmula de Haversine).
export function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// true se o ponto está dentro do raio da zona do alerta.
export function inZone(point, zone) {
  if (!point || !zone) return false;
  return distanceKm(point.lat, point.lon, zone.lat, zone.lon) <= zone.radiusKm;
}

// Posição atual do celular, ou null se não tiver permissão ou GPS.
export async function getDevicePoint() {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    let pos = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
    if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    if (!pos) return null;
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch (e) {
    return null;
  }
}
