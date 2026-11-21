// Site: não há "abrir outro app do Android". Quem chama já trata o erro.
export const ActivityAction = new Proxy({}, { get: (_, k) => String(k) });
export async function startActivityAsync() {
  throw new Error('Disponível só no app Android.');
}
export async function openApplication() {
  throw new Error('Disponível só no app Android.');
}
