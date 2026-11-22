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

// ---------- Previsão completa (aba Clima das Notícias e Lotus) ----------
// Agora + próximas horas + 7 dias, no local do usuário (GPS). Open-Meteo, gratuito e sem chave.
// Guarda por 30 min. Sem GPS, usa a última posição conhecida; sem nada, devolve null.
const FKEY = 'realys.forecast';
const FFRESH = 30 * 60 * 1000;
let fmem = null;
let fpending = null;
const DESC = (code) =>
  code == null ? '' : code === 0 ? 'Céu limpo' : code <= 2 ? 'Poucas nuvens' : code === 3 ? 'Nublado' : code <= 48 ? 'Neblina' : code <= 57 ? 'Garoa' : code <= 67 ? 'Chuva' : code <= 77 ? 'Neve' : code <= 82 ? 'Pancadas de chuva' : code <= 86 ? 'Neve' : 'Tempestade';
export const descricaoTempo = DESC;

async function fetchForecast() {
  const perm = await withSystemDialog(() => Location.requestForegroundPermissionsAsync());
  if (perm.status !== 'granted') return null;
  let pos = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 });
  if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  if (!pos) return null;
  const { latitude, longitude } = pos.coords;
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' + latitude.toFixed(3) + '&longitude=' + longitude.toFixed(3) +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
    '&hourly=temperature_2m,precipitation_probability,weather_code&forecast_hours=12' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset' +
    '&timezone=auto&forecast_days=7';
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  if (!j || !j.current || !j.daily) return null;
  let cidade = '';
  try {
    const g = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (g && g[0]) cidade = [g[0].city || g[0].subregion, g[0].region].filter(Boolean).join(' - ');
  } catch (e) {}
  const c = j.current;
  return {
    at: Date.now(),
    cidade,
    agora: { temp: Math.round(c.temperature_2m), sensacao: Math.round(c.apparent_temperature), umidade: c.relative_humidity_2m, vento: Math.round(c.wind_speed_10m), code: c.weather_code, desc: DESC(c.weather_code), isDay: c.is_day === 1 },
    horas: (j.hourly.time || []).map((t, i) => ({ hora: t.slice(11, 16), temp: Math.round(j.hourly.temperature_2m[i]), chuva: j.hourly.precipitation_probability[i], code: j.hourly.weather_code[i] })),
    dias: (j.daily.time || []).map((d, i) => ({
      data: d, max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]), chuva: j.daily.precipitation_probability_max[i],
      code: j.daily.weather_code[i], desc: DESC(j.daily.weather_code[i]), uv: j.daily.uv_index_max[i], nascer: (j.daily.sunrise[i] || '').slice(11, 16), por: (j.daily.sunset[i] || '').slice(11, 16),
    })),
  };
}

// Última previsão já guardada (sem esperar a internet), para a Lotus responder na hora.
export const peekForecast = () => fmem;

export async function getForecast({ force = false } = {}) {
  if (!force && fmem && Date.now() - fmem.at < FFRESH) return fmem;
  if (!fmem) {
    try {
      const raw = await AsyncStorage.getItem(FKEY);
      if (raw) fmem = JSON.parse(raw);
    } catch (e) {}
    if (!force && fmem && Date.now() - fmem.at < FFRESH) return fmem;
  }
  if (!fpending) {
    fpending = fetchForecast()
      .then((f) => {
        if (f) {
          fmem = f;
          AsyncStorage.setItem(FKEY, JSON.stringify(f)).catch(() => {});
        }
        return fmem;
      })
      .catch(() => fmem)
      .finally(() => (fpending = null));
  }
  return fpending;
}

// Ícone de um código de tempo.
export function iconeDoCodigo(code, day = true) {
  const k = kindOf(code);
  if (k === 'rain') return code >= 95 ? 'thunderstorm-outline' : 'rainy-outline';
  if (k === 'cloudy') return code === 3 || code >= 45 ? 'cloudy-outline' : day ? 'partly-sunny-outline' : 'cloudy-night-outline';
  return day ? 'sunny-outline' : 'moon-outline';
}

// Resumo falado (Lotus): "Em Passo Fundo agora faz 22 graus, poucas nuvens. Hoje máxima de 27 e mínima de 15, 60% de chance de chuva."
export function resumoTempo(f, quando = 'hoje') {
  if (!f) return null;
  const i = quando === 'amanha' ? 1 : 0;
  const d = f.dias[i];
  if (!d) return null;
  const onde = f.cidade ? `Em ${f.cidade.split(' - ')[0]}` : 'Aí';
  const chuva = d.chuva >= 60 ? `, com ${d.chuva}% de chance de chuva: leve o guarda-chuva` : d.chuva >= 30 ? `, ${d.chuva}% de chance de chuva` : ', sem previsão de chuva';
  if (i === 1) return `${onde}, amanhã: ${d.desc.toLowerCase()}, máxima de ${d.max} e mínima de ${d.min} graus${chuva}.`;
  return `${onde} agora faz ${f.agora.temp} graus, ${f.agora.desc.toLowerCase()}. Hoje a máxima é de ${d.max} e a mínima de ${d.min}${chuva}.`;
}
