// Site: sem digital/rosto do aparelho. A entrada é com usuário e senha (o servidor confere).
export const AuthenticationType = { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 };
export const SecurityLevel = { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 };
export async function hasHardwareAsync() { return false; }
export async function isEnrolledAsync() { return false; }
export async function supportedAuthenticationTypesAsync() { return []; }
export async function getEnrolledLevelAsync() { return 0; }
export async function authenticateAsync() { return { success: false, error: 'not_available' }; }
export async function cancelAuthenticate() {}
