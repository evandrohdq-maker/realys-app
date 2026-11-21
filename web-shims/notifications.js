// expo-notifications no site: o navegador recebe os avisos pelo WebSocket com o site aberto.
const noop = () => {};
const sub = { remove: noop };
export const AndroidImportance = { HIGH: 4, DEFAULT: 3 };
export const setNotificationHandler = noop;
export const setNotificationChannelAsync = async () => null;
export const getPermissionsAsync = async () => ({ status: 'denied' });
export const requestPermissionsAsync = async () => ({ status: 'denied' });
export const getDevicePushTokenAsync = async () => ({ data: null });
export const addPushTokenListener = () => sub;
export const getLastNotificationResponseAsync = async () => null;
export const addNotificationResponseReceivedListener = () => sub;
