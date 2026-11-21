// Site: o navegador não deixa bloquear print de tela; as chamadas viram "nada a fazer".
export async function preventScreenCaptureAsync() {}
export async function allowScreenCaptureAsync() {}
export async function isAvailableAsync() { return false; }
export function addScreenshotListener() { return { remove() {} }; }
export function usePreventScreenCapture() {}
export async function requestPermissionsAsync() { return { granted: false, status: 'denied' }; }
export async function getPermissionsAsync() { return { granted: false, status: 'denied' }; }
