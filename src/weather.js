// Tempo agora no local do usuário (GPS do celular) para o céu da caixa da Lotus
// e a temperatura no cantinho. Usa o Open-Meteo (gratuito, sem chave).
// Fica guardado por 20 minutos para não gastar bateria nem internet.
import * as Location from 'expo-location';
import { withSystemDialog } from './systemDialog';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'realys.weather';
const FRESH = 20 * 60 * 1000;
let mem = null;
let pending = null;

// Código de tempo (WMO) -> céu simples: limpo, nublado ou chuvoso.
export function kindOf(code) {
  if (code == null) return 'clear';
  if (code <= 1) return 'clear';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return 'cloudy'; // parcialmente nublado, encoberto, neblina, neve
}

async function fetchNow() {
  const perm = await withSystemDialog(() => Location.requestForegroundPermissionsAsync());
  if (perm.status !== 'granted') return null;
  let pos = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
  if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  if (!pos) return null;
  const { latitude, longitude } = pos.coords;
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' + latitude.toFixed(3) + '&longitude=' + longitude.toFixed(3) +
    '&current=temperature_2m,weather_code,is_day&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const c = j && j.current;
  if (!c) return null;
  return { temp: Math.round(c.temperature_2m), code: c.weather_code, kind: kindOf(c.weather_code), isDay: c.is_day === 1, at: Date.now(), south: latitude < 0 };
}

// Devolve o último tempo conhecido na hora (ou null) e atualiza em segundo plano.
export async function getWeather() {
  if (mem && Date.now() - mem.at < FRESH) return mem;
  if (!mem) {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) mem = JSON.parse(raw);
    } catch (e) {}
    if (mem && Date.now() - mem.at < FRESH) return mem;
  }
  if (!pending) {
    pending = fetchNow()
      .then((w) => {
        if (w) {
          mem = w;
          AsyncStorage.setItem(KEY, JSON.stringify(w)).catch(() => {});
        }
        return mem;
      })
      .catch(() => mem)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

// Céu da caixa: dia (sol), noite (lua), nublado ou chuvoso.
// Sem GPS ou sem internet, segue a hora do celular (sol de dia, lua à noite).
export function skyOf(w, date = new Date()) {
  const h = date.getHours();
  const day = w && w.at && Date.now() - w.at < 3 * 3600 * 1000 ? w.isDay : h >= 6 && h < 18;
  const kind = w ? w.kind : 'clear';
  if (kind === 'rain') return { mode: 'rain', day };
  if (kind === 'cloudy') return { mode: 'cloudy', day };
  return { mode: day ? 'day' : 'night', day };
}

// Fase da lua (0 = nova, 0,5 = cheia), pela data.
export function moonPhase(date = new Date()) {
  const ref = Date.UTC(2000, 0, 6, 18, 14); // uma lua nova conhecida
  const days = (date.getTime() - ref) / 86400000;
  const p = (days % 29.530589) / 29.530589;
  return p < 0 ? p + 1 : p;
}

// Ícone do tempo para o cantinho da temperatura.
export function weatherIcon(sky) {
  if (sky.mode === 'rain') return 'rainy-outline';
  if (sky.mode === 'cloudy') return sky.day ? 'partly-sunny-outline' : 'cloudy-night-outline';
  return sky.mode === 'day' ? 'sunny-outline' : 'moon-outline';
}
