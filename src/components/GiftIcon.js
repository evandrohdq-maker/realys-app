// Ícone de presente: emoji, ou a flor dourada da Lotus no presente "Flor de Lótus".
import React from 'react';
import { Text, Image } from 'react-native';
import { FAB } from './lotus/frames';

export default function GiftIcon({ gift, size = 28 }) {
  if (!gift) return null;
  if (gift.image === 'lotus') {
    // A flor aberta (a mesma do botão da Lotus), um pouco maior que o emoji para ter o mesmo peso.
    const s = Math.round(size * 1.3);
    return <Image source={FAB[1]} style={{ width: s, height: s }} resizeMode="contain" fadeDuration={0} />;
  }
  return <Text style={{ fontSize: size }}>{gift.emoji}</Text>;
}
