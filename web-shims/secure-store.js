// Site: o "cofre" do Android vira o armazenamento do navegador (sessão do servidor e contas salvas).
const ls = () => (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
const k = (key) => 'realys.sec.' + key;
export const AFTER_FIRST_UNLOCK = 0;
export const WHEN_UNLOCKED = 1;
export async function getItemAsync(key) { const s = ls(); return s ? s.getItem(k(key)) : null; }
export async function setItemAsync(key, value) { const s = ls(); if (s) s.setItem(k(key), String(value)); }
export async function deleteItemAsync(key) { const s = ls(); if (s) s.removeItem(k(key)); }
export function getItem(key) { const s = ls(); return s ? s.getItem(k(key)) : null; }
export function setItem(key, value) { const s = ls(); if (s) s.setItem(k(key), String(value)); }
export async function isAvailableAsync() { return !!ls(); }
export function canUseBiometricAuthentication() { return false; }
