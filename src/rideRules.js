// Segurança do motorista: tempo de espera no local de embarque.
// O motorista chega, toca em "Cheguei no local" e o passageiro é avisado. A partir daí o passageiro
// tem 10 minutos para embarcar. Se não embarcar, a corrida é encerrada: o motorista recebe o valor
// da corrida e o passageiro perde a corrida (o valor não volta).
// O passageiro é lembrado pela Lotus quando faltam 5 e 2 minutos.
import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useStore, serviceType } from './store';
import { speakSoft } from './voice';

export const NO_SHOW_MIN = 10;
const NO_SHOW_MS = NO_SHOW_MIN * 60 * 1000;

export const isTransport = (r) => !!r && (r.serviceKey ? serviceType(r.serviceKey).group === 'Transporte' : /motorista|motoboy|corrida|transporte/i.test(r.service || r.kind || ''));
// Esperando o passageiro? (chegou, ainda não embarcou, não terminou)
export const isWaiting = (r) => !!(r && r.arrivedAt && !r.boardedAt && !r.done);
export const waitLeftMs = (r, now = Date.now()) => Math.max(0, r.arrivedAt + NO_SHOW_MS - now);
export const mmss = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Contagem regressiva na tela (cartão da corrida do passageiro e do motorista).
export function WaitCountdown({ ride, style }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isWaiting(ride)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ride && ride.arrivedAt, ride && ride.boardedAt, ride && ride.done]);
  if (!isWaiting(ride)) return null;
  const left = waitLeftMs(ride, now);
  return <Text style={[{ fontWeight: '800', fontSize: 22, color: left < 120000 ? '#C0392B' : '#A8790A' }, style]}>{mmss(left)}</Text>;
}

// Fica de olho nas corridas (um só para o app inteiro): avisa o passageiro e encerra em 10 minutos.
export function RideWatcher() {
  const { state, dispatch } = useStore();
  const spoke = useRef({});
  const ridesRef = useRef(state.rides);
  ridesRef.current = state.rides;
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      ridesRef.current.filter(isWaiting).forEach((r) => {
        const left = waitLeftMs(r, now);
        if (left <= 0) return dispatch({ type: 'RIDE_NO_SHOW', id: r.id });
        // Lembretes de voz só para o passageiro (a corrida que ele pediu tem o prestador junto).
        if (!r.provider) return;
        const name = (r.provider.name || 'seu motorista').split(' ')[0];
        const said = spoke.current[r.id] || (spoke.current[r.id] = {});
        if (!said.arrived) {
          said.arrived = true;
          const car = r.provider.vehicle ? `, ${r.provider.vehicle}` : '';
          speakSoft(`${name} chegou${car}. Você tem ${NO_SHOW_MIN} minutos para embarcar.`);
          return;
        }
        if (left <= 5 * 60000 && left > 2 * 60000 && !said.five) {
          said.five = true;
          speakSoft(`${name} está te esperando no local. Faltam 5 minutos para embarcar.`);
        } else if (left <= 2 * 60000 && !said.two) {
          said.two = true;
          speakSoft(`Atenção: faltam 2 minutos. Se você não embarcar, a corrida será cobrada e encerrada.`);
        }
      });
    };
    const t = setInterval(tick, 5000);
    tick();
    return () => clearInterval(t);
  }, []);
  return null;
}
